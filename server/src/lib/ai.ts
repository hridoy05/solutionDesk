import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Gemini 3.8 Flash is available through Google AI Studio and is
// suitable for the short support-writing and classification tasks here.
export const AI_MODEL_ID = "gemini-3.8-flash";
export const gemini = google(AI_MODEL_ID);

// Gemini embedding model used for RAG retrieval over the knowledge base.
// gemini-embedding-001 natively truncates to 768 dimensions which keeps the
// `kb_chunk.embedding` vector column small and the free tier quota unpolluted.
export const EMBEDDING_MODEL_ID = "gemini-embedding-001";
export const embeddingModel = google.embedding(EMBEDDING_MODEL_ID);
