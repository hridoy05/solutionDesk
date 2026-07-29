import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Gemini 2.5 Flash is available through Google AI Studio's free tier and is
// suitable for the short support-writing and classification tasks here.
export const gemini = google("gemini-2.5-flash");
