import Sentry from "./sentry";
import { logBraintrustTrace } from "./braintrust";

export interface AiUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AiTelemetryRecord {
  id: string;
  operation: "classification" | "auto_resolve" | "summarize" | "polish" | "kb_retrieval";
  model: string;
  ticketId?: number;
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  outcome: "success" | "resolved" | "escalated" | "error" | "cached" | "blocked";
  cached?: boolean;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// Pricing per million tokens (USD)
// Gemini 2.5 Flash: $0.075 / 1M prompt tokens, $0.30 / 1M completion tokens
// Gemini Embedding 001: $0.00 / 1M (free tier) or nominal $0.02 / 1M
const MODEL_PRICING: Record<string, { promptPerM: number; completionPerM: number }> = {
  "gemini-3.8-flash": { promptPerM: 0.075, completionPerM: 0.3 },
  "gemini-2.5-flash": { promptPerM: 0.075, completionPerM: 0.3 },
  "gemini-embedding-001": { promptPerM: 0.02, completionPerM: 0.0 },
};

export function calculateAiCost(
  model: string,
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
  }
): number {
  if (!usage) return 0;
  const inTok = usage.inputTokens ?? usage.promptTokens ?? 0;
  const outTok = usage.outputTokens ?? usage.completionTokens ?? 0;
  const pricing = MODEL_PRICING[model] ?? { promptPerM: 0.1, completionPerM: 0.4 };
  const promptCost = (inTok / 1_000_000) * pricing.promptPerM;
  const completionCost = (outTok / 1_000_000) * pricing.completionPerM;
  return Number((promptCost + completionCost).toFixed(7));
}

// In-memory rolling telemetry store (keeps last 500 events for quick dashboard / observability reporting)
class AiTelemetryStore {
  private events: AiTelemetryRecord[] = [];
  private readonly maxEvents = 500;

  public record(event: Omit<AiTelemetryRecord, "id" | "timestamp">): AiTelemetryRecord {
    const fullRecord: AiTelemetryRecord = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.events.unshift(fullRecord);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    // Log to Braintrust Observability
    logBraintrustTrace({
      operation: event.operation,
      model: event.model,
      ticketId: event.ticketId,
      input: event.metadata?.input ?? { ticketId: event.ticketId },
      output: event.metadata?.output ?? { outcome: event.outcome },
      metadata: { ...event.metadata, cached: event.cached },
      metrics: {
        durationMs: event.durationMs,
        promptTokens: event.promptTokens,
        completionTokens: event.completionTokens,
        totalTokens: event.totalTokens,
        costUsd: event.costUsd,
      },
    });

    // Add Sentry breadcrumb for distributed tracing
    Sentry.addBreadcrumb({
      category: "ai.telemetry",
      message: `AI ${event.operation} on ${event.model} (${event.durationMs}ms, ${event.totalTokens} tokens, $${event.costUsd})`,
      level: event.outcome === "error" ? "error" : "info",
      data: {
        ticketId: event.ticketId,
        outcome: event.outcome,
        cached: event.cached,
        costUsd: event.costUsd,
      },
    });

    return fullRecord;
  }

  public getSummary() {
    const totalCalls = this.events.length;
    const totalTokens = this.events.reduce((sum, e) => sum + e.totalTokens, 0);
    const totalCostUsd = this.events.reduce((sum, e) => sum + e.costUsd, 0);
    const avgDurationMs = totalCalls
      ? Math.round(this.events.reduce((sum, e) => sum + e.durationMs, 0) / totalCalls)
      : 0;

    const byOperation = this.events.reduce((acc, e) => {
      acc[e.operation] = (acc[e.operation] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byOutcome = this.events.reduce((acc, e) => {
      acc[e.outcome] = (acc[e.outcome] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCalls,
      totalTokens,
      totalCostUsd: Number(totalCostUsd.toFixed(6)),
      avgDurationMs,
      byOperation,
      byOutcome,
      recentEvents: this.events.slice(0, 30),
    };
  }

  public clear() {
    this.events = [];
  }
}

export const aiTelemetry = new AiTelemetryStore();
