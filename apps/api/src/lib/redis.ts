import type { ApiConfig } from "@birthub/config";
import type { ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";

const redisClients = new Map<string, Redis>();
const bullConnections = new Map<string, ConnectionOptions>();

function buildBullConnection(redisUrl: string): ConnectionOptions {
  const parsed = new URL(redisUrl);
  const dbSegment = parsed.pathname.replace(/^\/+/, "");
  const db = dbSegment.length > 0 ? Number(dbSegment) : undefined;
  const connection: Record<string, unknown> = {
    host: parsed.hostname,
    maxRetriesPerRequest: null,
    port: parsed.port ? Number(parsed.port) : 6379
  };

  if (parsed.username) {
    connection.username = decodeURIComponent(parsed.username);
  }

  if (parsed.password) {
    connection.password = decodeURIComponent(parsed.password);
  }

  if (Number.isInteger(db) && (db ?? 0) >= 0) {
    connection.db = db;
  }

  if (parsed.protocol === "rediss:" || parsed.searchParams.get("tls") === "true") {
    connection.tls = {};
  }

  return connection as ConnectionOptions;
}

export function getSharedRedis(configOrUrl: ApiConfig | string): Redis {
  const redisUrl = typeof configOrUrl === "string" ? configOrUrl : configOrUrl.REDIS_URL;
  const existing = redisClients.get(redisUrl);

  if (existing) {
    return existing;
  }

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null
  });
  redisClients.set(redisUrl, redis);
  return redis;
}

export function getBullConnection(configOrUrl: ApiConfig | string): ConnectionOptions {
  const redisUrl = typeof configOrUrl === "string" ? configOrUrl : configOrUrl.REDIS_URL;
  const existing = bullConnections.get(redisUrl);

  if (existing) {
    return existing;
  }

  const connection = buildBullConnection(redisUrl);
  bullConnections.set(redisUrl, connection);
  return connection;
}
