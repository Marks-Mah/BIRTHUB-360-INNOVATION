const memoryCache = new Map();
export async function getCached(key) {
    const entry = memoryCache.get(key);
    if (!entry || entry.expiresAt <= Date.now())
        return null;
    return JSON.parse(entry.value);
}
export async function setCached(key, value, ttlSeconds) {
    memoryCache.set(key, { value: JSON.stringify(value), expiresAt: Date.now() + ttlSeconds * 1000 });
}
