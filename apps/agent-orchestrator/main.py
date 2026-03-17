from __future__ import annotations

import logging
import os
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, Literal

from fastapi import FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, Field

from agents.shared.security import validate_internal_service_token
from orchestrator.database import (
    count_agent_tasks_by_status,
    get_agent_task,
    init_db,
    list_agent_tasks,
    ping_database,
    upsert_agent_task,
)
from orchestrator.flows import (
    FLOW_BOARD_REPORT_GRAPH,
    FLOW_CHURN_RISK_HIGH_GRAPH,
    FLOW_DEAL_WON_GRAPH,
    FLOW_HEALTH_ALERT_GRAPH,
    FLOW_LEAD_LIFECYCLE_GRAPH,
)

logger = logging.getLogger("agent_orchestrator")

EventType = Literal["DEAL_CLOSED_WON", "HEALTH_ALERT", "CHURN_RISK_HIGH", "BOARD_REPORT"]


class RunRequest(BaseModel):
    lead_id: str
    context: Dict[str, Any]


class EventRunRequest(BaseModel):
    event_id: str = Field(min_length=3)
    event_type: EventType
    entity_id: str
    context: Dict[str, Any]
    tenant_id: str = Field(default="unknown", min_length=1)


RunRequest.model_rebuild()
EventRunRequest.model_rebuild()


class FlowStats:
    def __init__(self) -> None:
        self.started = 0
        self.succeeded = 0
        self.failed = 0
        self.total_latency_ms = 0.0

    def as_dict(self) -> Dict[str, Any]:
        throughput = self.succeeded + self.failed
        return {
            "started": self.started,
            "succeeded": self.succeeded,
            "failed": self.failed,
            "throughput": throughput,
            "avg_latency_ms": round((self.total_latency_ms / throughput), 2) if throughput else 0,
        }


FLOW_RUNNERS = {
    "DEAL_CLOSED_WON": FLOW_DEAL_WON_GRAPH,
    "HEALTH_ALERT": FLOW_HEALTH_ALERT_GRAPH,
    "CHURN_RISK_HIGH": FLOW_CHURN_RISK_HIGH_GRAPH,
    "BOARD_REPORT": FLOW_BOARD_REPORT_GRAPH,
}
FLOW_METRICS: defaultdict[str, FlowStats] = defaultdict(FlowStats)
EVENT_STORE: Dict[str, Dict[str, Any]] = {}
DLQ_STORE: Dict[str, Dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_strict_runtime() -> bool:
    environment = (os.getenv("NODE_ENV") or os.getenv("ENVIRONMENT") or "development").lower()
    return environment not in {"dev", "development", "test"} or os.getenv("CI") == "true"


async def _safe_init_db() -> None:
    try:
        await init_db()
    except Exception as exc:  # noqa: BLE001
        logger.warning("orchestrator db init skipped", extra={"error": str(exc)})


async def _safe_upsert_event(record: Dict[str, Any]) -> None:
    tenant_id = record.get("tenant_id")
    if not tenant_id:
        logger.warning(
            "orchestrator event persistence skipped",
            extra={"event_id": record.get("event_id"), "error": "missing_tenant_id"},
        )
        return

    try:
        await upsert_agent_task(
            record["event_id"],
            tenant_id,
            record.get("event_type", "unknown"),
            "process_event",
            record.get("context", {}),
            record.get("status", "unknown"),
            record.get("result"),
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("orchestrator event persistence skipped", extra={"event_id": record.get("event_id"), "error": str(exc)})


async def _load_persisted_event(event_id: str) -> Dict[str, Any] | None:
    try:
        return await get_agent_task(event_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("orchestrator event lookup skipped", extra={"event_id": event_id, "error": str(exc)})
        return None


async def _list_persisted_events(status: str | None = None, limit: int = 20) -> list[Dict[str, Any]] | None:
    try:
        return await list_agent_tasks(status=status, limit=limit)
    except Exception as exc:  # noqa: BLE001
        logger.warning("orchestrator events listing skipped", extra={"error": str(exc), "status": status})
        return None


async def _count_persisted_events() -> Dict[str, int] | None:
    try:
        return await count_agent_tasks_by_status()
    except Exception as exc:  # noqa: BLE001
        logger.warning("orchestrator event counters skipped", extra={"error": str(exc)})
        return None


def _duplicate_response(record: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "schemaVersion": "v1",
        "event_id": record["event_id"],
        "status": "duplicate",
        "result": record.get("result"),
    }


async def _execute_event(request: EventRunRequest, *, allow_retry: bool = False) -> Dict[str, Any]:
    existing = EVENT_STORE.get(request.event_id) or await _load_persisted_event(request.event_id)
    if existing and not allow_retry and existing.get("status") in {"completed", "cancelled", "processing"}:
        return _duplicate_response(existing)

    runner = FLOW_RUNNERS.get(request.event_type)
    if runner is None:
        raise HTTPException(status_code=404, detail=f"Flow runner not found for {request.event_type}")

    stats = FLOW_METRICS[request.event_type]
    stats.started += 1
    started = time.perf_counter()

    record = {
        "event_id": request.event_id,
        "event_type": request.event_type,
        "entity_id": request.entity_id,
        "context": request.context,
        "tenant_id": request.tenant_id,
        "status": "processing",
        "result": None,
        "created_at": existing.get("created_at", _now_iso()) if existing else _now_iso(),
        "updated_at": _now_iso(),
    }
    EVENT_STORE[request.event_id] = record
    await _safe_upsert_event(record)

    try:
        result = await runner.ainvoke({"entity_id": request.entity_id, "context": request.context, "actions_taken": [], "error": ""})
        stats.succeeded += 1
        stats.total_latency_ms += (time.perf_counter() - started) * 1000
        completed = {
            **record,
            "status": "completed",
            "result": result,
            "updated_at": _now_iso(),
        }
        EVENT_STORE[request.event_id] = completed
        DLQ_STORE.pop(request.event_id, None)
        await _safe_upsert_event(completed)
        return {
            "schemaVersion": "v1",
            "event_id": request.event_id,
            "status": "completed",
            "result": result,
        }
    except Exception as exc:  # noqa: BLE001
        stats.failed += 1
        stats.total_latency_ms += (time.perf_counter() - started) * 1000
        failed = {
            **record,
            "status": "failed",
            "result": {"error": str(exc)},
            "updated_at": _now_iso(),
        }
        EVENT_STORE[request.event_id] = failed
        DLQ_STORE[request.event_id] = failed
        await _safe_upsert_event(failed)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def _list_events(status: str | None = None, limit: int = 20) -> Dict[str, Any]:
    persisted = await _list_persisted_events(status=status, limit=limit)
    if persisted is not None:
        return {"size": len(persisted), "items": persisted}

    items = list(EVENT_STORE.values())
    if status:
        items = [item for item in items if item.get("status") == status]
    items.sort(key=lambda item: item.get("updated_at", ""), reverse=True)
    limited = items[:limit]
    return {"size": len(limited), "items": limited}


@asynccontextmanager
async def lifespan(_: FastAPI):
    await _safe_init_db()
    yield


app = FastAPI(title="birthub-agent-orchestrator", lifespan=lifespan)


@app.get("/health")
async def health() -> Dict[str, Any]:
    services = {
        "database": {"status": "up"},
        "flowRegistry": {"count": len(FLOW_RUNNERS), "status": "up" if FLOW_RUNNERS else "down"},
        "internalServiceToken": {
            "status": "up" if os.getenv("INTERNAL_SERVICE_TOKEN") else "down"
        },
    }
    status = "ok"

    try:
        await ping_database()
    except Exception as exc:  # noqa: BLE001
        services["database"] = {"status": "down", "message": str(exc)}
        status = "degraded"

    if _is_strict_runtime() and not os.getenv("INTERNAL_SERVICE_TOKEN"):
        services["internalServiceToken"] = {
            "message": "INTERNAL_SERVICE_TOKEN is required in strict runtime",
            "status": "down",
        }
        status = "degraded"

    if not FLOW_RUNNERS:
        status = "degraded"

    return {"flows": sorted(FLOW_RUNNERS.keys()), "services": services, "status": status}


@app.post("/run")
async def run_lead_lifecycle(request: RunRequest, x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    state = {"lead_id": request.lead_id, "context": request.context, "score": 0, "tier": "T4", "actions_taken": [], "error": ""}
    return await FLOW_LEAD_LIFECYCLE_GRAPH.ainvoke(state)


@app.post("/run/lifecycle")
async def run_lead_lifecycle_v1(request: RunRequest, x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    state = {"lead_id": request.lead_id, "context": request.context, "score": 0, "tier": "T4", "actions_taken": [], "error": ""}
    result = await FLOW_LEAD_LIFECYCLE_GRAPH.ainvoke(state)
    return {"schemaVersion": "v1", "status": "completed", "result": result}


@app.post("/events/run")
async def run_event_internal(request: EventRunRequest, x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    return await _execute_event(request)


@app.post("/run/event")
async def run_event_v1(request: EventRunRequest, x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    return await _execute_event(request)


@app.get("/events")
async def list_events(
    status: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    x_service_token: str | None = Header(default=None),
):
    validate_internal_service_token(x_service_token)
    return await _list_events(status=status, limit=limit)


@app.get("/events/summary")
async def events_summary(x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    counts = await _count_persisted_events()
    if counts is not None:
        return {"size": sum(counts.values()), "counts": counts}

    fallback_counts: Dict[str, int] = defaultdict(int)
    for item in EVENT_STORE.values():
        fallback_counts[item.get("status", "unknown")] += 1
    return {"size": len(EVENT_STORE), "counts": dict(fallback_counts)}


@app.get("/events/metrics")
async def get_metrics_legacy(event_type: EventType | None = Query(default=None), x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    if event_type:
        return {event_type: FLOW_METRICS[event_type].as_dict()}
    return {key: value.as_dict() for key, value in FLOW_METRICS.items()}


@app.get("/metrics/flows")
async def get_metrics_v1(x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    return {"metrics": {key: value.as_dict() for key, value in FLOW_METRICS.items()}}


@app.get("/dlq")
async def list_dlq(x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    persisted = await _list_persisted_events(status="failed", limit=100)
    if persisted is not None:
        return {"size": len(persisted), "items": persisted}

    items = list(DLQ_STORE.values())
    items.sort(key=lambda item: item.get("updated_at", ""), reverse=True)
    return {"size": len(items), "items": items}


@app.post("/dlq/reprocess/{event_id}")
async def reprocess_dlq_event(event_id: str, x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    record = DLQ_STORE.get(event_id) or await _load_persisted_event(event_id)
    if record is None or record.get("status") != "failed":
        raise HTTPException(status_code=404, detail="DLQ event not found")
    tenant_id = record.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=500, detail="DLQ event missing tenant context")
    request = EventRunRequest(
        event_id=record["event_id"],
        event_type=record["event_type"],
        entity_id=record["entity_id"],
        context=record.get("context", {}),
        tenant_id=tenant_id,
    )
    result = await _execute_event(request, allow_retry=True)
    DLQ_STORE.pop(event_id, None)
    return result


@app.get("/events/{event_id}")
async def get_event(event_id: str, x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    record = EVENT_STORE.get(event_id) or await _load_persisted_event(event_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return record


@app.post("/events/{event_id}/cancel")
async def cancel_event(event_id: str, x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    record = EVENT_STORE.get(event_id) or await _load_persisted_event(event_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if record.get("status") == "completed":
        return {"event_id": event_id, "status": "completed"}
    record["status"] = "cancelled"
    record["updated_at"] = _now_iso()
    EVENT_STORE[event_id] = record
    await _safe_upsert_event(record)
    return {"event_id": event_id, "status": "cancelled"}
