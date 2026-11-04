import type { PgBoss } from "pg-boss";
import { generateText } from "ai";
import { gemini, AI_MODEL_ID, EMBEDDING_MODEL_ID } from "./ai";
import Sentry from "./sentry";
import prisma from "../db";
import { sendEmailJob } from "./send-email";
import { retrieveKbContext, type KbMatch } from "./kb-retrieval";
import {
  prepareTicketContext,
  buildAutoResolveSystemPrompt,
  buildAutoResolveUserPrompt,
} from "./context-engineering";
import { aiTelemetry, calculateAiCost } from "./ai-telemetry";

const QUEUE_NAME = "auto-resolve-ticket";

interface AutoResolveJobData {
  ticketId: number;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
}

function buildKbPromptBlock(matches: KbMatch[]): string {
  const items = matches
    .map(
      (match, index) =>
        `[Q&A ${index + 1} | score ${match.score.toFixed(3)} | section: ${match.title}]\n Q: ${match.question}\n A: ${match.content}`
    )
    .join("\n\n");

  return (
    "The following approved Q&A articles were retrieved from the support " +
    "knowledge base as the most relevant to this ticket. Treat them as the " +
    "only source of truth for your answer:\n\n" +
    items
  );
}

export async function registerAutoResolveWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(QUEUE_NAME, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
  });

  await boss.work<AutoResolveJobData>(QUEUE_NAME, async (jobs) => {
    const { ticketId, subject, body, senderName, senderEmail } = jobs[0]!.data;
    const firstName = senderName.split(" ")[0] || "there";
    const startTime = Date.now();

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "processing" },
    });

    // 1. Context Engineering & Security Sanitization
    const { cleanedSubject, cleanedBody, isFlaggedSecurity, securityThreats } =
      await prepareTicketContext(subject, body, 2500);

    // Security Gate: If prompt injection or high security threat is detected, escalate immediately
    if (isFlaggedSecurity) {
      const durationMs = Date.now() - startTime;
      aiTelemetry.record({
        operation: "auto_resolve",
        model: AI_MODEL_ID,
        ticketId,
        durationMs,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        outcome: "blocked",
        metadata: { threats: securityThreats },
      });

      await prisma.$transaction([
        prisma.ticket.update({
          where: { id: ticketId },
          data: { status: "open", assignedToId: null },
        }),
        prisma.aiDecision.create({
          data: {
            ticketId,
            kind: "auto_resolve",
            model: AI_MODEL_ID,
            outcome: "escalated_security_threat",
            detail: "Prompt injection detected in ticket body",
          },
        }),
      ]);
      return;
    }

    // 2. KB Retrieval stage
    let retrieval: Awaited<ReturnType<typeof retrieveKbContext>>;
    let kbPromptBlock: string;
    const retrievalStart = Date.now();

    try {
      retrieval = await retrieveKbContext(`${cleanedSubject}\n\n${cleanedBody}`);
      kbPromptBlock = buildKbPromptBlock(retrieval.matches);

      aiTelemetry.record({
        operation: "kb_retrieval",
        model: EMBEDDING_MODEL_ID,
        ticketId,
        durationMs: Date.now() - retrievalStart,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        outcome: "success",
        metadata: { matchCount: retrieval.matches.length, bestScore: retrieval.bestScore },
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { queue: QUEUE_NAME, ticketId, stage: "kb-retrieval" },
      });
      console.error(`KB retrieval failed for ticket ${ticketId}:`, error);
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "open", assignedToId: null },
      });
      return;
    }

    // If no KB chunk passed similarity threshold, escalate immediately without generating text
    if (retrieval.matches.length === 0) {
      const durationMs = Date.now() - startTime;
      aiTelemetry.record({
        operation: "auto_resolve",
        model: EMBEDDING_MODEL_ID,
        ticketId,
        durationMs,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        outcome: "escalated",
        metadata: { reason: "no_kb_match" },
      });

      await prisma.$transaction([
        prisma.ticket.update({
          where: { id: ticketId },
          data: { status: "open", assignedToId: null },
        }),
        prisma.aiDecision.create({
          data: {
            ticketId,
            kind: "auto_resolve",
            model: EMBEDDING_MODEL_ID,
            outcome: "escalated",
            detail: "No KB chunk passed the minimum similarity score",
          },
        }),
      ]);
      return;
    }

    // 3. AI Text Generation with Structured Delimiters
    let response: string;
    let promptTokens = 0;
    let completionTokens = 0;
    const genStart = Date.now();

    try {
      const systemPrompt = buildAutoResolveSystemPrompt(kbPromptBlock, firstName);
      const userPrompt = buildAutoResolveUserPrompt(cleanedSubject, cleanedBody);

      const { text, usage } = await generateText({
        model: gemini,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 600, // Cost limit
      });

      response = text.trim();
      promptTokens = usage?.inputTokens ?? 0;
      completionTokens = usage?.outputTokens ?? 0;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { queue: QUEUE_NAME, ticketId, stage: "ai-response" },
      });
      console.error(`Auto-resolve AI call failed for ticket ${ticketId}:`, error);

      const durationMs = Date.now() - startTime;
      aiTelemetry.record({
        operation: "auto_resolve",
        model: AI_MODEL_ID,
        ticketId,
        durationMs,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        costUsd: calculateAiCost(AI_MODEL_ID, { promptTokens, completionTokens }),
        outcome: "error",
      });

      await prisma.$transaction([
        prisma.ticket.update({
          where: { id: ticketId },
          data: { status: "open", assignedToId: null },
        }),
        prisma.aiDecision.create({
          data: {
            ticketId,
            kind: "auto_resolve",
            model: AI_MODEL_ID,
            chunkIds: retrieval.matches.map((m) => m.chunkId),
            bestScore: retrieval.bestScore,
            outcome: "error",
            detail: "AI auto-resolve call failed",
          },
        }),
      ]);
      return;
    }

    const durationMs = Date.now() - startTime;
    const totalTokens = promptTokens + completionTokens;
    const costUsd = calculateAiCost(AI_MODEL_ID, { promptTokens, completionTokens });

    // Handle ESCALATE response
    if (response === "ESCALATE") {
      aiTelemetry.record({
        operation: "auto_resolve",
        model: AI_MODEL_ID,
        ticketId,
        durationMs,
        promptTokens,
        completionTokens,
        totalTokens,
        costUsd,
        outcome: "escalated",
      });

      await prisma.$transaction([
        prisma.ticket.update({
          where: { id: ticketId },
          data: { status: "open", assignedToId: null },
        }),
        prisma.aiDecision.create({
          data: {
            ticketId,
            kind: "auto_resolve",
            model: AI_MODEL_ID,
            chunkIds: retrieval.matches.map((m) => m.chunkId),
            bestScore: retrieval.bestScore,
            outcome: "escalated",
            detail: "AI judged retrieved Q&A as insufficient",
          },
        }),
      ]);
      return;
    }

    // Successful resolution
    try {
      aiTelemetry.record({
        operation: "auto_resolve",
        model: AI_MODEL_ID,
        ticketId,
        durationMs,
        promptTokens,
        completionTokens,
        totalTokens,
        costUsd,
        outcome: "resolved",
      });

      await prisma.$transaction([
        prisma.reply.create({
          data: {
            body: response,
            senderType: "agent",
            ticketId,
            userId: null,
          },
        }),
        prisma.ticket.update({
          where: { id: ticketId },
          data: { status: "resolved" },
        }),
        prisma.aiDecision.create({
          data: {
            ticketId,
            kind: "auto_resolve",
            model: AI_MODEL_ID,
            chunkIds: retrieval.matches.map((m) => m.chunkId),
            bestScore: retrieval.bestScore,
            outcome: "resolved",
            detail: null,
          },
        }),
      ]);

      await sendEmailJob({
        to: senderEmail,
        subject: `Re: ${subject}`,
        body: response,
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { queue: QUEUE_NAME, ticketId, stage: "persist" },
      });
      throw error;
    }
  });
}

export async function sendAutoResolveJob(ticket: {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
}): Promise<void> {
  const { boss } = await import("./queue");
  await boss.send(QUEUE_NAME, {
    ticketId: ticket.id,
    subject: ticket.subject,
    body: ticket.body,
    senderName: ticket.senderName,
    senderEmail: ticket.senderEmail,
  });
}