from __future__ import annotations

import json
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, TypedDict

from dotenv import load_dotenv
from google import genai
from langgraph.graph import StateGraph

from agents.shared.db_pool import get_pool
from agents.shared.rate_limiter import RateLimiter

load_dotenv()


class BaseAgentState(TypedDict):
    tenant_id: str
    context: Dict[str, Any]
    messages: List[Any]
    actions_taken: List[Any]
    data: Optional[Dict[str, Any]]
    error: Optional[str]


@dataclass
class AgentResult:
    agent_id: str
    task: str
    status: Literal["success", "error", "pending"]
    data: dict
    error: str | None
    duration_ms: float
    timestamp: datetime


class BaseAgent(ABC):
    def __init__(self, name: str, model_name: str = "gemini-1.5-pro", rate_limiter: RateLimiter | None = None):
        self.name = name
        self.model_name = model_name
        self.llm = self._init_gemini(model_name)
        self.graph = self._build_graph()
        redis_url = os.getenv("REDIS_URL", "")
        self.rate_limiter = rate_limiter or RateLimiter(
            redis_url=redis_url,
            window_seconds=int(os.getenv("AGENT_RATE_LIMIT_WINDOW_SECONDS", "60")),
            max_requests=int(os.getenv("AGENT_RATE_LIMIT_MAX_REQUESTS", "120")),
        )

    def _init_gemini(self, model: str):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return None
        client = genai.Client(api_key=api_key)
        return client.models

    @abstractmethod
    def _build_graph(self) -> StateGraph:
        ...

    @abstractmethod
    async def execute(self, task: str, payload: dict) -> AgentResult:
        ...

    async def run(self, job_data: Dict[str, Any]) -> AgentResult:
        started = time.perf_counter()
        tenant_id = str(job_data.get("tenantId") or job_data.get("tenant_id") or "unknown")
        task = str(job_data.get("task") or "run")
        allowed, _ = await self.rate_limiter.check_and_increment(f"{tenant_id}:{self.name}")
        if not allowed:
            return AgentResult(
                agent_id=self.name,
                task=task,
                status="error",
                data={},
                error="rate_limit_exceeded",
                duration_ms=(time.perf_counter() - started) * 1000,
                timestamp=datetime.now(timezone.utc),
            )

        state: BaseAgentState = {
            "tenant_id": tenant_id,
            "context": job_data.get("context", job_data),
            "messages": [],
            "actions_taken": [],
            "data": None,
            "error": None,
        }

        try:
            if not self.graph:
                raise RuntimeError("Graph not initialized")
            result_state = await self.graph.ainvoke(state)
            if result_state.get("error"):
                raise RuntimeError(str(result_state["error"]))
            data = result_state.get("data") or result_state.get("output") or {}
            await self._log_to_db(state=result_state, job_id=job_data.get("jobId"), tenant_id=tenant_id)
            return AgentResult(
                agent_id=self.name,
                task=task,
                status="success",
                data=data,
                error=None,
                duration_ms=(time.perf_counter() - started) * 1000,
                timestamp=datetime.now(timezone.utc),
            )
        except Exception as exc:  # noqa: BLE001
            state["error"] = str(exc)
            await self._log_to_db(state=state, job_id=job_data.get("jobId"), tenant_id=tenant_id)
            return AgentResult(
                agent_id=self.name,
                task=task,
                status="error",
                data={},
                error=str(exc),
                duration_ms=(time.perf_counter() - started) * 1000,
                timestamp=datetime.now(timezone.utc),
            )

    async def _log_to_db(self, state: Dict[str, Any], job_id: Optional[str], tenant_id: Optional[str]) -> None:
        if not os.getenv("DATABASE_URL"):
            return
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO \"AgentLog\" (id, \"agentName\", \"jobId\", action, input, output, error, \"createdAt\")
                VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, $5::jsonb, $6, NOW())
                """,
                self.name,
                job_id,
                "run",
                json.dumps(state.get("context", {})),
                json.dumps(state.get("data") or state.get("output") or {}),
                state.get("error"),
            )
