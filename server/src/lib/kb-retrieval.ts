import prisma from "../db";
import { embed } from "ai";
import { embeddingModel } from "./ai";

export const vectorLiteral = (embedding: number[]): string =>
  `[${embedding.join(",")}]`;

export interface KbMatch {
  chunkId: number;
  articleId: number;
  title: string;
  question: string;
  content: string;
  score: number;
}

export interface KbRetrievalResult {
  matches: KbMatch[];
  bestScore: number;
}

export async function retrieveKbContext(query: string, topK = 4, minScore = 0.35): Promise<KbRetrievalResult> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: query,
    providerOptions: {
      google: {
        outputDimensionality: 768,
        taskType: "RETRIEVAL_QUERY",
      },
    },
  });

  const rows = await prisma.$queryRaw<
    Array<{
      id: number;
      articleId: number;
      title: string;
      question: string;
      content: string;
      score: number;
    }>
  >`
    SELECT
      c.id,
      c."articleId" AS "articleId",
      a.title,
      a.question,
      c.content,
      1 - (c.embedding <=> ${vectorLiteral(embedding)}::vector) AS score
    FROM "kb_chunk" c
    JOIN "kb_article" a ON a.id = c."articleId"
    WHERE a.active = true
    ORDER BY c.embedding <=> ${vectorLiteral(embedding)}::vector
    LIMIT ${topK}
  `;

  const matches = rows
    .filter((row) => row.score >= minScore)
    .map((row) => ({
      chunkId: row.id,
      articleId: row.articleId,
      title: row.title,
      question: row.question,
      content: row.content,
      score: row.score,
    }));

  const bestScore = matches.reduce(
    (max, match) => Math.max(max, match.score),
    0
  );

  return { matches, bestScore };
}