import { Redis } from "ioredis";
import { createLogger } from "@birthub/logger";

export interface CacheStore {
  del: (...keys: string[]) => Promise<number>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttlSeconds: number) => Promise<void>;
}

class CacheStoreError extends Error {
  public override readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "CacheStoreError";
    this.cause = cause;
  }
}

class NoopCacheStore implements CacheStore {
  async del(): Promise<number> {
    return 0;
  }

  async get(): Promise<string | null> {
    return null;
  }

  async set(): Promise<void> {
    // noop
  }
}

class InMemoryCacheStore implements CacheStore {
  private readonly entries = new Map<string, { expiresAt: number; value: string }>();

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;

    for (const key of keys) {
      if (this.entries.delete(key)) {
        deleted += 1;
      }
    }

    return deleted;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.entries.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.entries.set(key, {
      expiresAt: Date.now() + ttlSeconds * 1000,
      value
    });
  }
}

class RedisCacheStore implements CacheStore {
  private readonly client: Redis;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });
    this.client.on("error", () => {
      // handled by fallback logic on operation errors
    });
  }

  private async connectIfNeeded(): Promise<void> {
    if (this.client.status === "wait") {
      await this.client.connect();
    }
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    await this.connectIfNeeded();
    return this.client.del(...keys);
  }

  async get(key: string): Promise<string | null> {
    await this.connectIfNeeded();
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.connectIfNeeded();
    await this.client.set(key, value, "EX", ttlSeconds);
  }
}

const noopStore = new NoopCacheStore();
const inMemoryStore = new InMemoryCacheStore();
const logger = createLogger("cache-store");

let cacheStore: CacheStore = noopStore;
let strictCacheMode = false;

function useFallbackStore(): void {
  cacheStore = inMemoryStore;
}

export function configureCacheStore(
  redisUrl: string | undefined,
  nodeEnv = process.env.NODE_ENV ?? "development"
): void {
  strictCacheMode = nodeEnv === "production";

  if (!redisUrl?.trim()) {
    if (strictCacheMode) {
      logger.error(
        {
          event: "cache.configuration.invalid",
          nodeEnv,
          reason: "missing_redis_url"
        },
        "Redis is required for cache operations in production"
      );
      throw new CacheStoreError("CACHE_CONFIGURATION_INVALID");
    }

    useFallbackStore();
    return;
  }

  cacheStore = new RedisCacheStore(redisUrl);
}

export async function deleteCacheKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  try {
    await cacheStore.del(...keys);
  } catch (error) {
    logger.error(
      {
        err: error,
        event: "cache.delete.failed",
        keyCount: keys.length
      },
      "Cache delete operation failed"
    );

    if (strictCacheMode) {
      throw new CacheStoreError("CACHE_DELETE_FAILED", error);
    }

    useFallbackStore();
  }
}

export async function readCacheValue(key: string): Promise<string | null> {
  try {
    return await cacheStore.get(key);
  } catch (error) {
    logger.error(
      {
        err: error,
        event: "cache.read.failed",
        key
      },
      "Cache read operation failed"
    );

    if (strictCacheMode) {
      throw new CacheStoreError("CACHE_READ_FAILED", error);
    }

    useFallbackStore();
    return null;
  }
}

export function setCacheStoreForTests(store: CacheStore | null): void {
  cacheStore = store ?? noopStore;
}

export async function writeCacheValue(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  try {
    await cacheStore.set(key, value, ttlSeconds);
  } catch (error) {
    logger.error(
      {
        err: error,
        event: "cache.write.failed",
        key,
        ttlSeconds
      },
      "Cache write operation failed"
    );

    if (strictCacheMode) {
      throw new CacheStoreError("CACHE_WRITE_FAILED", error);
    }

    useFallbackStore();
  }
}
