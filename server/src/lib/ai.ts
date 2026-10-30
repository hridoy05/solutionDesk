import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Gemini 2.5 Flash is available through Google AI Studio's free tier and is
// suitable for the short support-writing and classification tasks here.
export const gemini = google("gemini-2.5-flash");

// Gemini embedding model used for RAG retrieval over the knowledge base.
// gemini-embedding-001 natively truncates to 768 dimensions which keeps the
// `kb_chunk.embedding` vector column small and the free tier quota unpolluted.
export const AI_MODEL_ID = "gemini-2.5-flash";
export const EMBEDDING_MODEL_ID = "gemini-embedding-001";
export const embeddingModel = google.embedding(EMBEDDING_MODEL_ID);
