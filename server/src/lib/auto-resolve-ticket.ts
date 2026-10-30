import type { PgBoss } from "pg-boss";
import { generateText } from "ai";
import { gemini } from "./ai";
import Sentry from "./sentry";
import prisma from "../db";
import { sendEmailJob } from "./send-email";
import { retrieveKbContext, type KbMatch } from "./kb-retrieval";

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
        `[Q&A ${index + 1} | score ${
          match.score.toFixed(3)
        } | section: ${match.title}]\n Q: ${match.question}\n A: ${match.content}`
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
    const firstName = senderName.split(" ")[0];

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "processing" },
    });

    let retrieval: Awaited<ReturnType<typeof retrieveKbContext>>;
    let kbPromptBlock: string;
    try {
      retrieval = await retrieveKbContext(`${subject}\n\n${body}`);
      kbPromptBlock = buildKbPromptBlock(retrieval.matches);
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

    if (retrieval.matches.length === 0) {
      await prisma.$transaction([
        prisma.ticket.update({
          where: { id: ticketId },
          data: { status: "open", assignedToId: null },
        }),
        prisma.aiDecision.create({
          data: {
            ticketId,
            kind: "auto_resolve",
            model: "gemini-embedding-001",
            outcome: "escalated",
            detail: "No KB chunk passed the minimum similarity score",
          },
        }),
      ]);
      return;
    }

    let response: string;
    try {
      const { text } = await generateText({
        model: gemini,
        system:
          "You are a friendly and professional support agent for Code with Mosh. " +
          "Use ONLY the approved retrieved knowledge base Q&A articles to answer the customer's question.\n\n" +
          kbPromptBlock +
          "\n\nGuidelines for your response:\n" +
          `- Address the customer by their first name: ${firstName}\n` +
          "- Use a warm, professional, and customer-friendly tone\n" +
          "- Format the response clearly with line breaks between paragraphs\n" +
          "- Use bullet points or numbered lists when listing steps or multiple items\n" +
          "- End with an offer to help further, e.g. 'If you have any other questions, feel free to reach out.'\n" +
          "- Sign off with:\n\nBest regards,\nCode with Mosh Support\n\n" +
          'If the retrieved articles do NOT contain enough information to fully resolve the question, respond with exactly "ESCALATE" and nothing else.',
        prompt: `Subject: ${subject}\n\nBody: ${body}`,
      });
      response = text.trim();
    } catch (error) {
      Sentry.captureException(error, {
        tags: { queue: QUEUE_NAME, ticketId, stage: "ai-response" },
      });
      console.error(`Auto-resolve AI call failed for ticket ${ticketId}:`, error);
      await prisma.$transaction([
        prisma.ticket.update({
          where: { id: ticketId },
          data: { status: "open", assignedToId: null },
        }),
        prisma.aiDecision.create({
          data: {
            ticketId,
            kind: "auto_resolve",
            model: "gemini-embedding-001",
            chunkIds: retrieval.matches.map((m) => m.chunkId),
            bestScore: retrieval.bestScore,
            outcome: "error",
          },
        }),
      ]);
      return;
    }

    if (response === "ESCALATE") {
      await prisma.$transaction([
        prisma.ticket.update({
          where: { id: ticketId },
          data: { status: "open", assignedToId: null },
        }),
        prisma.aiDecision.create({
          data: {
            ticketId,
            kind: "auto_resolve",
            model: "gemini-embedding-001",
            chunkIds: retrieval.matches.map((m) => m.chunkId),
            bestScore: retrieval.bestScore,
            outcome: "escalated",
            detail: "AI judged the retrieved Q&A as insufficient",
          },
        }),
      ]);
      return;
    }

    try {
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
            model: "gemini-embedding-001",
            chunkIds: retrieval.matches.map((m) => m.chunkId),
            bestScore: retrieval.bestScore,
            outcome: "resolved",
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