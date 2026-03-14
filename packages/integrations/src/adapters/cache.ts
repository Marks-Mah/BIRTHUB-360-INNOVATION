const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export async function getCached<T>(key: string): Promise<T | null> {
  const entry = memoryCache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return JSON.parse(entry.value) as T;
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  memoryCache.set(key, { value: JSON.stringify(value), expiresAt: Date.now() + ttlSeconds * 1000 });
}
