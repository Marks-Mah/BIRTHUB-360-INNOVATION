from __future__ import annotations

import logging
import time
from dataclasses import dataclass

try:
    from redis.asyncio import Redis
except Exception:  # pragma: no cover
    Redis = None

logger = logging.getLogger("agents.rate_limiter")


@dataclass
class RateLimiter:
    redis_url: str
    window_seconds: int
    max_requests: int

    def __post_init__(self) -> None:
        self._redis: Redis | None = None

    async def _client(self) -> Redis | None:
        if self._redis is not None:
            return self._redis
        if Redis is None or not self.redis_url:
            return None
        try:
            self._redis = Redis.from_url(self.redis_url, decode_responses=True)
            await self._redis.ping()
            return self._redis
        except Exception as exc:  # noqa: BLE001
            logger.warning("Rate limiter Redis unavailable, failing open", extra={"error": str(exc)})
            self._redis = None
            return None

    def _key(self, key: str) -> str:
        bucket = int(time.time() // self.window_seconds)
        return f"rate_limit:{key}:{bucket}"

    async def check_and_increment(self, key: str) -> tuple[bool, int]:
        client = await self._client()
        if client is None:
            return True, 0

        now = time.time()
        window_start = now - self.window_seconds
        redis_key = self._key(key)

        try:
            pipe = client.pipeline()
            pipe.zremrangebyscore(redis_key, 0, window_start)
            pipe.zadd(redis_key, {f"{now:.6f}": now})
            pipe.zcard(redis_key)
            pipe.expire(redis_key, self.window_seconds + 1)
            _, _, count, _ = await pipe.execute()
            return int(count) <= self.max_requests, int(count)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Rate limiter execution failed, failing open", extra={"error": str(exc)})
            return True, 0

    async def get_remaining(self, key: str) -> int:
        client = await self._client()
        if client is None:
            return self.max_requests
        redis_key = self._key(key)
        now = time.time()
        window_start = now - self.window_seconds
        try:
            await client.zremrangebyscore(redis_key, 0, window_start)
            count = int(await client.zcard(redis_key))
            return max(self.max_requests - count, 0)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Rate limiter remaining check failed, failing open", extra={"error": str(exc)})
            return self.max_requests
