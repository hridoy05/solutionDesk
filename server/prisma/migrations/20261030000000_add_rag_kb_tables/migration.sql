-- pgvector extension for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "kb_article" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kb_article_question_key" ON "kb_article"("question");

-- CreateTable
CREATE TABLE "kb_chunk" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (HNSW cosine similarity index)
CREATE INDEX "kb_chunk_embedding_cosine_idx" ON "kb_chunk" USING hnsw ("embedding" vector_cosine_ops);

-- CreateIndex
CREATE UNIQUE INDEX "kb_chunk_articleId_chunkIndex_key" ON "kb_chunk"("articleId", "chunkIndex");

-- CreateTable
CREATE TABLE "ai_decision" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "chunkIds" JSONB,
    "bestScore" DOUBLE PRECISION,
    "outcome" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_decision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_decision_ticketId_idx" ON "ai_decision"("ticketId");

-- AddForeignKey
ALTER TABLE "kb_chunk" ADD CONSTRAINT "kb_chunk_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "kb_article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_decision" ADD CONSTRAINT "ai_decision_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
