from __future__ import annotations

import json
import os
from typing import Any

import asyncpg

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/agent_orchestrator")
_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
    return _pool


async def init_db() -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_tasks (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                agent_type TEXT NOT NULL,
                task TEXT NOT NULL,
                payload JSONB NOT NULL,
                status TEXT NOT NULL,
                result JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )


async def upsert_agent_task(task_id: str, tenant_id: str, agent_type: str, task: str, payload: dict[str, Any], status: str, result: dict[str, Any] | None = None) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO agent_tasks (id, tenant_id, agent_type, task, payload, status, result)
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb)
            ON CONFLICT (id) DO UPDATE SET
                tenant_id = EXCLUDED.tenant_id,
                agent_type = EXCLUDED.agent_type,
                task = EXCLUDED.task,
                payload = EXCLUDED.payload,
                status = EXCLUDED.status,
                result = EXCLUDED.result,
                updated_at = NOW()
            """,
            task_id,
            tenant_id,
            agent_type,
            task,
            json.dumps(payload),
            status,
            json.dumps(result) if result is not None else None,
        )
