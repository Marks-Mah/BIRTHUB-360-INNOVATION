from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel, Field

from agents.shared.errors import AgentToolError


class AlignmentInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class RevenueScenarioInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class ForecastDriftInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class RevOpsActionInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


async def build_revenue_alignment_map(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = AlignmentInput(context=context)
    score = min(100, max(0, int(payload.context.get("lead_score", 70))))
    profile = payload.context.get("profile", "mid_market")
    return {
        "summary": f"Diagnóstico inicial para perfil {profile}",
        "score": score,
        "priority": "high" if score >= 80 else "medium" if score >= 60 else "low",
    }


async def simulate_revenue_scenarios(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = RevenueScenarioInput(context=context)
    win_signals = int(payload.context.get("win_signals", 3))
    risk_signals = int(payload.context.get("risk_signals", 1))
    value = max(0, min(100, 60 + (win_signals * 8) - (risk_signals * 10)))
    return {
        "index": value,
        "classification": "strong" if value >= 75 else "stable" if value >= 55 else "fragile",
        "drivers": {"win_signals": win_signals, "risk_signals": risk_signals},
    }


async def detect_forecast_drift(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = ForecastDriftInput(context=context)
    owner = payload.context.get("owner", "comercial")
    steps: List[Dict[str, Any]] = [
        {"step": "diagnostico", "owner": owner, "eta_days": 2},
        {"step": "execucao", "owner": owner, "eta_days": 5},
        {"step": "revisao", "owner": owner, "eta_days": 2},
    ]
    return {"steps": steps, "count": len(steps)}


async def generate_revops_actions(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = RevOpsActionInput(context=context)
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
async def validate_funnel_conversion(context: Dict[str, Any]) -> Dict[str, Any]:
    mql_sql = float(context.get("mql_sql", 0.35))
    sql_op = float(context.get("sql_op", 0.3))
    op_win = float(context.get("op_win", 0.25))
    return {"end_to_end": round(mql_sql * sql_op * op_win, 4)}


async def map_process_bottlenecks(context: Dict[str, Any]) -> Dict[str, Any]:
    cycle = context.get("cycle_days_by_stage", {"qualificacao": 5, "proposal": 12})
    bottleneck = max(cycle, key=cycle.get)
    return {"bottleneck": bottleneck, "days": cycle[bottleneck]}


async def enforce_data_governance(context: Dict[str, Any]) -> Dict[str, Any]:
    missing = int(context.get("mandatory_missing", 0))
    return {"governance_status": "violated" if missing > 0 else "ok", "missing": missing}


async def suggest_comp_plan_adjustments(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"adjustments": ["bonus_para_renovacao", "acelerador_novo_logo"], "period": context.get("period", "trimestre")}


async def build_exec_revenue_pack(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"kpis": ["arr", "nrr", "cac_payback"], "audience": context.get("audience", "c-level")}


async def estimate_planning_accuracy(context: Dict[str, Any]) -> Dict[str, Any]:
    forecast = float(context.get("forecast", 500000))
    actual = float(context.get("actual", 450000))
    if forecast <= 0:
        raise AgentToolError(code="INVALID_FORECAST", message="forecast deve ser maior que zero")
    error = abs(actual - forecast) / forecast
    return {"accuracy": round(1 - error, 4)}


async def calculate_revenue_leakage(context: Dict[str, Any]) -> Dict[str, Any]:
    expected = float(context.get("expected", 0))
    realized = float(context.get("realized", 0))
    leakage = max(0.0, expected - realized)
    return {"leakage": round(leakage, 2), "expected": expected, "realized": realized}
