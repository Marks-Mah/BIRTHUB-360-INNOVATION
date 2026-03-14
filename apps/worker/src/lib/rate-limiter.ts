import type { Redis } from "ioredis";

export class DynamicRateLimiter {
  constructor(private readonly redis: Redis) {}

  /**
   * Applies rate limiting using a fixed window algorithm in Redis.
   * Throws an Error if the rate limit is exceeded.
   */
  async consume(key: string, limit: number, windowSeconds: number): Promise<void> {
    const currentWindow = Math.floor(Date.now() / 1000 / windowSeconds);
    const redisKey = `rate_limit:${key}:${currentWindow}`;

    const multi = this.redis.multi();
    multi.incr(redisKey);
    multi.expire(redisKey, windowSeconds * 2);

    const results = await multi.exec();
    if (!results || results.length === 0) {
      throw new Error("Failed to execute rate limit check");
    }

    const count = results[0]?.[1] as number;
    if (count > limit) {
      throw new Error(`Rate limit exceeded for key: ${key}`);
    }
  }
}
