import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { EMBEDDING_MODEL_ID, parseKnowledgeBase, embedKbArticles } from "../src/lib/kb";
import path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const kbPath = path.resolve(import.meta.dirname!, "../../knowledge-base.md");
  const articles = parseKnowledgeBase(
    await import("fs").then((fs) => fs.readFileSync(kbPath, "utf-8"))
  );

  if (articles.length === 0) {
    console.error("No Q&A articles parsed from knowledge-base.md — aborting.");
    process.exit(1);
  }

  console.log(
    `Parsed ${articles.length} articles. Embedding with ${EMBEDDING_MODEL_ID}...`
  );

  const embeddings = await embedKbArticles(articles);

  const vectorLiteral = (embedding: number[]) => `[${embedding.join(",")}]`;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i]!;

    const saved = await prisma.kbArticle.upsert({
      where: { question: article.question },
      create: {
        title: article.title,
        question: article.question,
        answer: article.answer,
      },
      update: {
        title: article.title,
        answer: article.answer,
      },
    });

    await prisma.$executeRaw`
      INSERT INTO "kb_chunk" ("articleId", "chunkIndex", "content", "embedding")
      VALUES (${saved.id}, 0, ${article.answer}, ${vectorLiteral(embeddings[i]!)}::vector)
      ON CONFLICT ("articleId", "chunkIndex")
      DO UPDATE SET "content" = EXCLUDED."content", "embedding" = EXCLUDED."embedding"
    `;
  }

  const savedArticles = await prisma.kbArticle.findMany();
  const importedQuestions = new Set(articles.map((a) => a.question));
  const removed = await prisma.kbArticle.deleteMany({
    where: { question: { notIn: [...importedQuestions] } },
  });

  console.log(
    `Imported ${savedArticles.length} kb_article rows and ${embeddings.length} kb_chunk vectors. ` +
      `Removed ${removed.count} stale articles.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
