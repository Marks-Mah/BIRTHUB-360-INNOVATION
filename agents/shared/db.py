import os
import asyncpg
from typing import Optional, Dict, Any, List

class DB:
    _pool: Optional[asyncpg.Pool] = None

    @classmethod
    async def get_pool(cls) -> asyncpg.Pool:
        if cls._pool is None:
            url = os.getenv("DATABASE_URL")
            if not url:
                raise ValueError("DATABASE_URL not set")
            cls._pool = await asyncpg.create_pool(url)
        return cls._pool

    @classmethod
    async def close(cls):
        if cls._pool:
            await cls._pool.close()
            cls._pool = None

    @classmethod
    async def fetchrow(cls, query: str, *args) -> Optional[asyncpg.Record]:
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    @classmethod
    async def execute(cls, query: str, *args) -> str:
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            return await conn.execute(query, *args)

    @classmethod
    async def log_agent_action(cls, agent_name: str, action: str, input_data: Dict[str, Any], output_data: Dict[str, Any], duration_ms: int = 0, error: Optional[str] = None):
        """Logs an agent action to the AgentLog table."""
        import json
        import uuid

        # Use cuid2 if available, else uuid
        try:
            from cuid2 import cuid_wrapper as cuid
            log_id = cuid()
        except ImportError:
            log_id = str(uuid.uuid4())

        query = """
            INSERT INTO "AgentLog" ("id", "agentName", "action", "input", "output", "durationMs", "error", "createdAt")
            VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, NOW())
        """

        await cls.execute(
            query,
            log_id,
            agent_name,
            action,
            json.dumps(input_data),
            json.dumps(output_data),
            duration_ms,
            error
        )
