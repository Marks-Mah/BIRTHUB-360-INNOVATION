"""Event schema (Redis Streams)
- AgentTaskEvent: event_id, tenant_id, agent_type, task, payload, timestamp, correlation_id
- Result events are published to `agent_results` with the same identifiers + status/data/error.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import json

from pydantic import BaseModel, Field

from redis.asyncio import Redis


class AgentTaskEvent(BaseModel):
    event_id: str
    tenant_id: str
    agent_type: str
    task: str
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: str


class EventBus:
    def __init__(self, redis_url: str, stream_name: str = "agent_tasks", result_stream: str = "agent_results"):
        self.redis = Redis.from_url(redis_url, decode_responses=True)
        self.stream_name = stream_name
        self.result_stream = result_stream

    async def publish(self, event: AgentTaskEvent) -> str:
        message = event.model_dump()
        message["payload"] = json.dumps(message["payload"])
        message["timestamp"] = message["timestamp"].isoformat()
        return await self.redis.xadd(self.stream_name, {k: str(v) for k, v in message.items()})

    async def consume(self, consumer_group: str, consumer_name: str, count: int = 10, block_ms: int = 2000):
        try:
            await self.redis.xgroup_create(self.stream_name, consumer_group, id="0", mkstream=True)
        except Exception:
            pass
        return await self.redis.xreadgroup(consumer_group, consumer_name, {self.stream_name: ">"}, count=count, block=block_ms)

    async def publish_result(self, event_id: str, correlation_id: str, status: str, data: dict[str, Any] | None = None, error: str | None = None) -> str:
        payload = {
            "event_id": event_id,
            "correlation_id": correlation_id,
            "status": status,
            "data": (data or {}),
            "error": error or "",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        return await self.redis.xadd(self.result_stream, {k: str(v) for k, v in payload.items()})
