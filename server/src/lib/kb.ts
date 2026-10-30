import { EMBEDDING_MODEL_ID, embeddingModel } from "./ai";
import { embedMany } from "ai";

export interface KbArticleSeed {
  title: string;
  question: string;
  answer: string;
}

const SEPARATOR_LINE = /^-+$/;

export function parseKnowledgeBase(content: string): KbArticleSeed[] {
  const articles: KbArticleSeed[] = [];
  const lines = content.split("\n");

  let title = "";
  let question: string | null = null;
  let answerLines: string[] = [];

  const flush = () => {
    const answer = answerLines.join("\n").trim();
    if (question && answer) {
      articles.push({ title, question, answer });
    }
    question = null;
    answerLines = [];
  };

  for (const line of lines) {
    if (SEPARATOR_LINE.test(line.trim())) continue;

    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      flush();
      title = heading[1]!.replace(/^\d+\.\s*/, "").trim();
      continue;
    }

    const q = line.match(/^###\s+Q:\s*(.+)$/);
    if (q) {
      flush();
      question = q[1]!.trim();
      continue;
    }

    if (question !== null) {
      answerLines.push(line);
    }
  }
  flush();

  return articles;
}

export function embedKbArticles(articles: KbArticleSeed[]): Promise<number[][]> {
  if (articles.length === 0) return Promise.resolve([]);
  return embedMany({
    model: embeddingModel,
    values: articles.map((a) => `${a.question}\n${a.answer}`),
    providerOptions: {
      google: {
        outputDimensionality: 768,
        taskType: "RETRIEVAL_DOCUMENT",
      },
    },
  }).then((result) => result.embeddings);
}

export { EMBEDDING_MODEL_ID };