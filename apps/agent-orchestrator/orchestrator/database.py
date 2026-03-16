from __future__ import annotations

import json
import os
from typing import Any

import asyncpg

DATABASE_URL = os.getenv("DATABASE_URL")
_pool: asyncpg.Pool | None = None


def _is_strict_runtime() -> bool:
    environment = (os.getenv("NODE_ENV") or os.getenv("ENVIRONMENT") or "development").lower()
    return environment not in {"dev", "development", "test"} or os.getenv("CI") == "true"


def _require_database_url() -> str:
    if DATABASE_URL:
        return DATABASE_URL
    if _is_strict_runtime():
        raise RuntimeError("DATABASE_URL is required for agent orchestrator in strict runtime")
    return "postgresql://postgres:postgres@localhost:5432/agent_orchestrator"


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(_require_database_url(), min_size=1, max_size=10)
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


async def ping_database() -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.fetchval("SELECT 1")


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


def _serialize_task_record(row: asyncpg.Record) -> dict[str, Any]:
    return {
        "context": row["payload"],
        "created_at": row["created_at"].isoformat(),
        "entity_id": row["id"],
        "event_id": row["id"],
        "event_type": row["agent_type"],
        "result": row["result"],
        "status": row["status"],
        "tenant_id": row["tenant_id"],
        "updated_at": row["updated_at"].isoformat(),
    }


async def get_agent_task(task_id: str) -> dict[str, Any] | None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, tenant_id, agent_type, payload, status, result, created_at, updated_at
            FROM agent_tasks
            WHERE id = $1
            """,
            task_id,
        )

    if row is None:
        return None

    return _serialize_task_record(row)


async def list_agent_tasks(status: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        if status is None:
            rows = await conn.fetch(
                """
                SELECT id, tenant_id, agent_type, payload, status, result, created_at, updated_at
                FROM agent_tasks
                ORDER BY updated_at DESC
                LIMIT $1
                """,
                limit,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT id, tenant_id, agent_type, payload, status, result, created_at, updated_at
                FROM agent_tasks
                WHERE status = $1
                ORDER BY updated_at DESC
                LIMIT $2
                """,
                status,
                limit,
            )

    return [_serialize_task_record(row) for row in rows]


async def count_agent_tasks_by_status() -> dict[str, int]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT status, COUNT(*)::INT AS total
            FROM agent_tasks
            GROUP BY status
            """
        )

    return {row["status"]: row["total"] for row in rows}
