from __future__ import annotations

import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, Literal
from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, Field

from agents.shared.security import validate_internal_service_token
from orchestrator.database import init_db, upsert_agent_task
from orchestrator.flows import FLOW_BOARD_REPORT_GRAPH, FLOW_CHURN_RISK_HIGH_GRAPH, FLOW_DEAL_WON_GRAPH, FLOW_HEALTH_ALERT_GRAPH, FLOW_LEAD_LIFECYCLE_GRAPH

app = FastAPI(title="birthub-agent-orchestrator")

EventType = Literal["DEAL_CLOSED_WON", "HEALTH_ALERT", "CHURN_RISK_HIGH", "BOARD_REPORT"]


class RunRequest(BaseModel):
    lead_id: str
    context: Dict[str, Any]


class EventRunRequest(BaseModel):
    event_id: str = Field(min_length=3)
    event_type: EventType
    entity_id: str
    context: Dict[str, Any]
    tenant_id: str = "default"


class FlowStats:
    def __init__(self) -> None:
        self.started = 0
        self.succeeded = 0
        self.failed = 0
        self.total_latency_ms = 0.0

    def as_dict(self) -> Dict[str, Any]:
        throughput = self.succeeded + self.failed
        return {"started": self.started, "succeeded": self.succeeded, "failed": self.failed, "throughput": throughput, "avg_latency_ms": round((self.total_latency_ms / throughput), 2) if throughput else 0}


FLOW_RUNNERS = {
    "DEAL_CLOSED_WON": FLOW_DEAL_WON_GRAPH,
    "HEALTH_ALERT": FLOW_HEALTH_ALERT_GRAPH,
    "CHURN_RISK_HIGH": FLOW_CHURN_RISK_HIGH_GRAPH,
    "BOARD_REPORT": FLOW_BOARD_REPORT_GRAPH,
}
FLOW_METRICS: defaultdict[str, FlowStats] = defaultdict(FlowStats)


@app.on_event("startup")
async def startup() -> None:
    await init_db()


@app.post("/run")
async def run_lead_lifecycle(request: RunRequest, x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    state = {"lead_id": request.lead_id, "context": request.context, "score": 0, "tier": "T4", "actions_taken": [], "error": ""}
    return await FLOW_LEAD_LIFECYCLE_GRAPH.ainvoke(state)


@app.post("/events/run")
async def run_event(request: EventRunRequest, x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    graph = FLOW_RUNNERS[request.event_type]
    started = time.perf_counter()
    stats = FLOW_METRICS[request.event_type]
    stats.started += 1
    await upsert_agent_task(request.event_id, request.tenant_id, request.event_type, "process_event", request.context, "processing")
    try:
        result = await graph.ainvoke({"entity_id": request.entity_id, "context": request.context, "actions_taken": [], "error": ""})
        stats.succeeded += 1
        stats.total_latency_ms += (time.perf_counter() - started) * 1000
        await upsert_agent_task(request.event_id, request.tenant_id, request.event_type, "process_event", request.context, "completed", result)
        return {"event_id": request.event_id, "status": "completed", "result": result}
    except Exception as exc:  # noqa: BLE001
        stats.failed += 1
        await upsert_agent_task(request.event_id, request.tenant_id, request.event_type, "process_event", request.context, "failed", {"error": str(exc)})
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/events/metrics")
async def get_metrics(event_type: EventType | None = Query(default=None), x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    if event_type:
        return {event_type: FLOW_METRICS[event_type].as_dict()}
    return {k: v.as_dict() for k, v in FLOW_METRICS.items()}
