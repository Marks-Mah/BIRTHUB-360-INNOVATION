from __future__ import annotations

import json
import logging
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, TypedDict

from dotenv import load_dotenv
from google import genai
from langgraph.graph import StateGraph

from agents.shared.db_pool import get_pool
from agents.shared.rate_limiter import RateLimiter

load_dotenv()
logger = logging.getLogger("BaseAgent")


class BaseAgentState(TypedDict):
    tenant_id: str
    lead_id: Optional[str]
    deal_id: Optional[str]
    customer_id: Optional[str]
    context: Dict[str, Any]
    messages: List[Any]
    actions_taken: List[Any]
    output: Optional[Dict[str, Any]]
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
    legacy: Dict[str, Any] = field(default_factory=dict)

    def to_legacy_dict(self) -> Dict[str, Any]:
        payload = dict(self.legacy)
        resolved_output = payload.get("output") or self.data or payload.get("data") or {}
        resolved_data = self.data or payload.get("data") or payload.get("output") or {}
        payload.setdefault("status", self.status)
        payload.setdefault("agent_id", self.agent_id)
        payload.setdefault("task", self.task)
        payload.setdefault("error", self.error)
        payload["data"] = resolved_data
        payload["output"] = resolved_output
        return payload

    def __getitem__(self, key: str) -> Any:
        return self.to_legacy_dict()[key]

    def get(self, key: str, default: Any = None) -> Any:
        return self.to_legacy_dict().get(key, default)

    def __contains__(self, key: object) -> bool:
        return key in self.to_legacy_dict()

    def keys(self):
        return self.to_legacy_dict().keys()

    def items(self):
        return self.to_legacy_dict().items()


class BaseAgent(ABC):
    def __init__(
        self,
        name: str,
        model_name: str = "gemini-1.5-pro",
        rate_limiter: RateLimiter | None = None,
        gemini_model: str | None = None,
    ):
        self.name = name
        resolved_model = gemini_model or model_name
        self.model_name = resolved_model
        self.llm = self._init_gemini(resolved_model)
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

    async def execute(self, task: str, payload: dict) -> AgentResult:
        return await self.run({"task": task, "context": payload, "tenantId": payload.get("tenant_id", "unknown")})

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
            **job_data,
            "tenant_id": tenant_id,
            "context": job_data.get("context", job_data),
            "messages": job_data.get("messages", []),
            "actions_taken": job_data.get("actions_taken", []),
            "data": job_data.get("data"),
            "error": job_data.get("error"),
        }

        try:
            if not self.graph:
                raise RuntimeError("Graph not initialized")
            result_state = await self.graph.ainvoke(state)
            if result_state.get("error"):
                raise RuntimeError(str(result_state["error"]))
            data = result_state.get("data") or result_state.get("output") or {}
            legacy = dict(result_state)
            legacy.setdefault("data", data)
            legacy.setdefault("output", data)
            await self._log_to_db(state=result_state, job_id=job_data.get("jobId"), tenant_id=tenant_id)
            return AgentResult(
                agent_id=self.name,
                task=task,
                status="success",
                data=data,
                error=None,
                duration_ms=(time.perf_counter() - started) * 1000,
                timestamp=datetime.now(timezone.utc),
                legacy=legacy,
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
                legacy={"error": str(exc), "data": {}, "output": {}},
            )

    async def _log_to_db(self, state: Dict[str, Any], job_id: Optional[str], tenant_id: Optional[str]) -> None:
        if not os.getenv("DATABASE_URL"):
            return
        try:
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
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Agent log persistence skipped",
                extra={
                    "agent": self.name,
                    "error": str(exc),
                    "job_id": job_id,
                    "tenant_id": tenant_id,
                },
            )
