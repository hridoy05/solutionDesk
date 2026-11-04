import { initLogger, type Logger } from "braintrust";

// Initialize Braintrust logger with project name when API key is provided
let logger: ReturnType<typeof initLogger> | null = null;

if (process.env.BRAINTRUST_API_KEY) {
  try {
    logger = initLogger({
      projectName: process.env.BRAINTRUST_PROJECT_NAME || "solutiondesk",
      apiKey: process.env.BRAINTRUST_API_KEY,
    });
  } catch (error) {
    console.warn("Braintrust logger initialization warning:", error);
  }
}

export { logger as braintrustLogger };

export interface BraintrustTraceData {
  operation: "classification" | "auto_resolve" | "summarize" | "polish" | "kb_retrieval";
  model: string;
  ticketId?: number;
  input: unknown;
  output: unknown;
  metadata?: Record<string, unknown>;
  metrics?: {
    durationMs?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costUsd?: number;
  };
  scores?: Record<string, number>;
}

/**
 * Log an AI trace event to Braintrust
 */
export function logBraintrustTrace(data: BraintrustTraceData): void {
  if (!logger) return;

  try {
    logger.log({
      input: data.input,
      output: data.output,
      metadata: {
        operation: data.operation,
        model: data.model,
        ticketId: data.ticketId,
        ...data.metadata,
      },
      metrics: {
        duration: data.metrics?.durationMs ? data.metrics.durationMs / 1000 : undefined,
        prompt_tokens: data.metrics?.promptTokens,
        completion_tokens: data.metrics?.completionTokens,
        tokens: data.metrics?.totalTokens,
        cost: data.metrics?.costUsd,
      },
      scores: data.scores,
    });
  } catch (error) {
    console.warn("Failed to log trace to Braintrust:", error);
  }
}
