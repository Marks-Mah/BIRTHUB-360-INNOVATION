from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel, Field

from agents.shared.errors import AgentToolError


class CadenceInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class SlaInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class RoutingInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class DailyBriefInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


async def orchestrate_cadence_control(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = CadenceInput(context=context)
    score = min(100, max(0, int(payload.context.get("lead_score", 70))))
    profile = payload.context.get("profile", "mid_market")
    return {
        "summary": f"Diagnóstico inicial para perfil {profile}",
        "score": score,
        "priority": "high" if score >= 80 else "medium" if score >= 60 else "low",
    }


async def monitor_sla_execution(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = SlaInput(context=context)
    win_signals = int(payload.context.get("win_signals", 3))
    risk_signals = int(payload.context.get("risk_signals", 1))
    value = max(0, min(100, 60 + (win_signals * 8) - (risk_signals * 10)))
    return {
        "index": value,
        "classification": "strong" if value >= 75 else "stable" if value >= 55 else "fragile",
        "drivers": {"win_signals": win_signals, "risk_signals": risk_signals},
    }


async def route_leads_by_capacity(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = RoutingInput(context=context)
    owner = payload.context.get("owner", "comercial")
    steps: List[Dict[str, Any]] = [
        {"step": "diagnostico", "owner": owner, "eta_days": 2},
        {"step": "execucao", "owner": owner, "eta_days": 5},
        {"step": "revisao", "owner": owner, "eta_days": 2},
    ]
    return {"steps": steps, "count": len(steps)}


async def build_daily_execution_brief(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = DailyBriefInput(context=context)
    base_value = float(payload.context.get("base_value", 100000.0))
    confidence = float(payload.context.get("confidence", 0.72))
    if confidence < 0 or confidence > 1:
        raise AgentToolError(code="INVALID_CONFIDENCE", message="confidence deve estar entre 0 e 1")
    projected = round(base_value * confidence, 2)
    return {
        "projected_value": projected,
        "confidence": confidence,
        "band": "high" if confidence >= 0.75 else "medium" if confidence >= 0.5 else "low",
    }
async def forecast_team_capacity(context: Dict[str, Any]) -> Dict[str, Any]:
    reps = int(context.get("reps", 6))
    slots_per_rep = int(context.get("slots_per_rep", 20))
    return {"weekly_capacity": reps * slots_per_rep}


async def rebalance_queue_priority(context: Dict[str, Any]) -> Dict[str, Any]:
    hot = int(context.get("hot_leads", 0))
    cold = int(context.get("cold_leads", 0))
    return {"priority_ratio": round((hot + 1) / (cold + 1), 2)}


async def detect_sla_breaches(context: Dict[str, Any]) -> Dict[str, Any]:
    overdue = int(context.get("overdue", 0))
    return {"overdue": overdue, "status": "alert" if overdue > 5 else "ok"}


async def generate_shift_plan(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"shifts": ["manha", "tarde"], "coverage": context.get("coverage", "full")}


async def score_rep_workload(context: Dict[str, Any]) -> Dict[str, Any]:
    tasks = context.get("tasks", [8, 7, 6])
    avg = sum(tasks) / max(1, len(tasks))
    return {"avg_workload": round(avg, 2), "risk": "high" if avg > 12 else "normal"}


async def build_handoff_protocol(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"stages": ["qualificacao", "diagnostico", "agendamento_ae"], "owner": context.get("owner", "coord_comercial")}


async def monitor_queue_aging(context: Dict[str, Any]) -> Dict[str, Any]:
    aging_hours = context.get("aging_hours", [])
    if not aging_hours:
        return {"avg_aging_hours": 0.0, "max_aging_hours": 0.0}
    avg = sum(float(item) for item in aging_hours) / len(aging_hours)
    return {"avg_aging_hours": round(avg, 2), "max_aging_hours": max(float(item) for item in aging_hours)}
