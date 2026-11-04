import crypto from "crypto";

interface CacheEntry<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
}

export class AiSimpleCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxEntries: number;
  private defaultTtlMs: number;

  constructor(options: { maxEntries?: number; defaultTtlMs?: number } = {}) {
    this.maxEntries = options.maxEntries ?? 200;
    this.defaultTtlMs = options.defaultTtlMs ?? 1000 * 60 * 30; // 30 minutes
  }

  public generateKey(prefix: string, ...inputs: unknown[]): string {
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(inputs))
      .digest("hex")
      .slice(0, 16);
    return `${prefix}:${hash}`;
  }

  public get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  public set(key: string, data: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      createdAt: now,
      expiresAt: now + (ttlMs ?? this.defaultTtlMs),
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public getStats() {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
    };
  }
}

// Global cache instances for different AI operations
export const classificationCache = new AiSimpleCache<{
  category: string;
  confidence: number;
  reasoning: string;
}>({ maxEntries: 300, defaultTtlMs: 1000 * 60 * 60 * 6 }); // 6 hours

export const summaryCache = new AiSimpleCache<string>({
  maxEntries: 150,
  defaultTtlMs: 1000 * 60 * 30, // 30 mins
});
