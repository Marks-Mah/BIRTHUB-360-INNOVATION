from __future__ import annotations

import asyncio
import json
from typing import Awaitable, Callable

from orchestrator.event_bus import AgentTaskEvent, EventBus

AgentHandler = Callable[[str, dict], Awaitable[dict]]


class OrchestratorWorker:
    def __init__(self, event_bus: EventBus, handlers: dict[str, AgentHandler]):
        self.event_bus = event_bus
        self.handlers = handlers
        self._processed: set[str] = set()

    async def process_forever(self, group: str = "orchestrator", consumer: str = "worker-1") -> None:
        while True:
            batches = await self.event_bus.consume(group, consumer)
            for _stream, events in batches:
                for message_id, payload in events:
                    await self._process_one(message_id, payload)

    async def _process_one(self, message_id: str, payload: dict[str, str]) -> None:
        event_id = payload.get("event_id")
        if event_id in self._processed:
            return
        self._processed.add(event_id)

        event = AgentTaskEvent(
            event_id=event_id,
            tenant_id=payload.get("tenant_id", "unknown"),
            agent_type=payload.get("agent_type", "unknown"),
            task=payload.get("task", "run"),
            payload=json.loads(payload.get("payload", "{}")),
            correlation_id=payload.get("correlation_id", ""),
        )

        handler = self.handlers.get(event.agent_type)
        if not handler:
            await self.event_bus.publish_result(event.event_id, event.correlation_id, "error", error="handler_not_found")
            return

        try:
            result = await handler(event.task, event.payload)
            await self.event_bus.publish_result(event.event_id, event.correlation_id, "success", data=result)
        except Exception as exc:  # noqa: BLE001
            await self.event_bus.publish_result(event.event_id, event.correlation_id, "error", error=str(exc))


async def run_worker(event_bus: EventBus, handlers: dict[str, AgentHandler]) -> None:
    worker = OrchestratorWorker(event_bus, handlers)
    await worker.process_forever()


if __name__ == "__main__":
    async def _noop(_task: str, _payload: dict) -> dict:
        return {"ok": True}

    asyncio.run(run_worker(EventBus("redis://localhost:6379"), {"noop": _noop}))
