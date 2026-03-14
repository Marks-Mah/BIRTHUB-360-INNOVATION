interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class AnalyticsRepository {
  private cache = new Map<string, CacheEntry<unknown>>();

  async getFunnelMetrics() {
    return this.getOrSet("funnel", 15_000, async () => ({
      visitors: 12000,
      leads: 1500,
      opportunities: 320,
      won: 84,
    }));
  }

  async getAttributionMetrics() {
    return this.getOrSet("attribution", 15_000, async () => ({
      channels: [
        { channel: "organic", revenue: 60000 },
        { channel: "paid", revenue: 42000 },
      ],
    }));
  }

  private async getOrSet<T>(key: string, ttlMs: number, producer: () => Promise<T>): Promise<T> {
    const existing = this.cache.get(key) as CacheEntry<T> | undefined;
    const now = Date.now();
    if (existing && existing.expiresAt > now) return existing.data;

    const data = await producer();
    this.cache.set(key, { data, expiresAt: now + ttlMs });
    return data;
  }
}
