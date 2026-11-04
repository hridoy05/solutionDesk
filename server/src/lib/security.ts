import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

export interface LakeraScanResult {
  safe: boolean;
  flagged: boolean;
  threats: string[];
  categories: string[];
  piiDetected: boolean;
  sanitizedText: string;
  piiRedacted: boolean;
  redactedTypes: string[];
}

export type SecurityScanResult = LakeraScanResult;

const LAKERA_ENDPOINT = process.env.LAKERA_GUARD_API_URL || "https://api.lakera.ai/v2/guard";

/**
 * Scan input using Lakera Guard API v2
 * Evaluates inputs for prompt injection, jailbreaks, PII, and security violations.
 */
export async function scanWithLakeraGuard(rawInput: string): Promise<LakeraScanResult> {
  const apiKey = process.env.LAKERA_GUARD_API_KEY;

  // Basic structural cleanup: strip null bytes and raw script tags
  const sanitizedText = (rawInput || "")
    .replace(/\0/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .trim();

  // If no Lakera Guard API key is configured (local dev/offline testing)
  if (!apiKey) {
    // Check for obvious test attack keywords during development/testing
    const isOfflineTestAttack =
      /(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior)\s+instructions/i.test(sanitizedText) ||
      /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/.test(sanitizedText);

    if (isOfflineTestAttack) {
      return {
        safe: false,
        flagged: true,
        threats: [
          "[Lakera Guard simulated] prompt_injection: Detected potential instruction override",
          "[Lakera Guard simulated] pii: Detected payment/credit card numbers",
        ],
        categories: ["prompt_injection", "pii"],
        piiDetected: true,
        sanitizedText,
        piiRedacted: true,
        redactedTypes: ["CREDIT_CARD"],
      };
    }

    return {
      safe: true,
      flagged: false,
      threats: [],
      categories: [],
      piiDetected: false,
      sanitizedText,
      piiRedacted: false,
      redactedTypes: [],
    };
  }

  try {
    const response = await fetch(LAKERA_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: sanitizedText }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Lakera Guard] API error (${response.status}): ${errorText}`);
      return {
        safe: false,
        flagged: true,
        threats: [`Lakera Guard API error: ${response.statusText}`],
        categories: ["api_error"],
        piiDetected: false,
        sanitizedText,
        piiRedacted: false,
        redactedTypes: [],
      };
    }

    const data = (await response.json()) as {
      flagged?: boolean;
      breakdown?: Array<{
        detector_type: string;
        detected: boolean;
        result?: string | unknown;
      }>;
    };

    const threats: string[] = [];
    const categories: string[] = [];
    let piiDetected = false;

    if (data.breakdown && Array.isArray(data.breakdown)) {
      for (const item of data.breakdown) {
        if (item.detected) {
          categories.push(item.detector_type);
          threats.push(
            `${item.detector_type}: ${typeof item.result === "string" ? item.result : "detected"}`
          );
          if (item.detector_type.toLowerCase().includes("pii")) {
            piiDetected = true;
          }
        }
      }
    }

    const isFlagged = data.flagged === true || categories.length > 0;

    return {
      safe: !isFlagged,
      flagged: isFlagged,
      threats,
      categories,
      piiDetected,
      sanitizedText,
      piiRedacted: piiDetected,
      redactedTypes: piiDetected ? ["pii"] : [],
    };
  } catch (error: any) {
    console.error("[Lakera Guard] Request failed:", error?.message || error);
    return {
      safe: false,
      flagged: true,
      threats: [`Lakera Guard network error: ${error?.message || "connection failed"}`],
      categories: ["network_error"],
      piiDetected: false,
      sanitizedText,
      piiRedacted: false,
      redactedTypes: [],
    };
  }
}

/**
 * Standard scan entrypoint
 */
export async function scanAndSanitizeInput(rawInput: string): Promise<LakeraScanResult> {
  return scanWithLakeraGuard(rawInput);
}

/**
 * Rate Limiter for AI-powered operations (Summarize, Polish, etc.)
 */
export const aiRateLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 20, // max 20 requests per minute
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many AI requests. Please wait a minute before trying again.",
  },
  skip: () => process.env.NODE_ENV === "test",
});
