from __future__ import annotations

import json
import os
from typing import Any
import hashlib

import asyncpg
from redis.asyncio import Redis


class AgentMemory:
    def __init__(self, redis_url: str | None = None, database_url: str | None = None):
        self.redis = Redis.from_url(redis_url or os.getenv("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
        self.database_url = database_url or os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/agent_orchestrator")

    async def store(self, key: str, value: dict[str, Any], session_id: str) -> None:
        redis_key = f"agent_memory:session:{session_id}"
        await self.redis.hset(redis_key, key, json.dumps(value))
        await self.redis.expire(redis_key, 60 * 60 * 24)

    async def recall(self, query: str, session_id: str, top_k: int = 3) -> list[dict[str, Any]]:
        redis_key = f"agent_memory:session:{session_id}"
        short_term = await self.redis.hgetall(redis_key)
        short_term_values = [json.loads(v) for v in short_term.values()]

        # Redis read-through cache for DB paginator mitigation
        cache_key = f"db_cache:{session_id}:{hashlib.md5(query.encode()).hexdigest()}:{top_k}"
        cached_result = await self.redis.get(cache_key)
        if cached_result:
            long_term_values = json.loads(cached_result)
        else:
            pool = await asyncpg.create_pool(self.database_url, min_size=1, max_size=2)
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT id, content
                    FROM long_term_memory
                    WHERE session_id = $1 AND content ILIKE $2
                    ORDER BY created_at DESC
                    LIMIT $3
                    """,
                    session_id,
                    f"%{query}%",
                    top_k,
                )
            await pool.close()
            long_term_values = [dict(row) for row in rows]
            # Set cache with 5-minute expiration
            await self.redis.set(cache_key, json.dumps(long_term_values), ex=300)

        return short_term_values[:top_k] + long_term_values[:top_k]
