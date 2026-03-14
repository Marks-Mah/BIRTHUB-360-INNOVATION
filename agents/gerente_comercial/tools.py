from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel, Field

from agents.shared.errors import AgentToolError


class TeamForecastInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class PipelineGapInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class CoachingInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class DealReviewInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


async def build_team_forecast(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = TeamForecastInput(context=context)
    score = min(100, max(0, int(payload.context.get("lead_score", 70))))
    profile = payload.context.get("profile", "mid_market")
    return {
        "summary": f"Diagnóstico inicial para perfil {profile}",
        "score": score,
        "priority": "high" if score >= 80 else "medium" if score >= 60 else "low",
    }


async def detect_pipeline_gaps(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = PipelineGapInput(context=context)
    win_signals = int(payload.context.get("win_signals", 3))
    risk_signals = int(payload.context.get("risk_signals", 1))
    value = max(0, min(100, 60 + (win_signals * 8) - (risk_signals * 10)))
    return {
        "index": value,
        "classification": "strong" if value >= 75 else "stable" if value >= 55 else "fragile",
        "drivers": {"win_signals": win_signals, "risk_signals": risk_signals},
    }


async def recommend_coaching_actions(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = CoachingInput(context=context)
    owner = payload.context.get("owner", "comercial")
    steps: List[Dict[str, Any]] = [
        {"step": "diagnostico", "owner": owner, "eta_days": 2},
        {"step": "execucao", "owner": owner, "eta_days": 5},
        {"step": "revisao", "owner": owner, "eta_days": 2},
    ]
    return {"steps": steps, "count": len(steps)}


async def prioritize_deals_for_review(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = DealReviewInput(context=context)
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
async def rank_pipeline_risks(context: Dict[str, Any]) -> Dict[str, Any]:
    stalled = int(context.get("stalled_deals", 0))
    return {"stalled_deals": stalled, "risk": "high" if stalled >= 5 else "moderate"}


async def define_weekly_targets(context: Dict[str, Any]) -> Dict[str, Any]:
    revenue_goal = float(context.get("revenue_goal", 300000))
    reps = max(1, int(context.get("reps", 6)))
    return {"target_per_rep": round(revenue_goal / reps, 2)}


async def detect_coaching_gaps(context: Dict[str, Any]) -> Dict[str, Any]:
    qa_scores = context.get("qa_scores", [78, 81, 69])
    low = [score for score in qa_scores if score < 75]
    return {"gaps": len(low), "needs_attention": len(low) > 0}


async def optimize_stage_velocity(context: Dict[str, Any]) -> Dict[str, Any]:
    cycle_days = float(context.get("cycle_days", 42))
    target = float(context.get("target_days", 35))
    return {"delta_days": round(cycle_days - target, 2)}


async def produce_pipeline_review(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"agenda": ["deal_estrategicos", "bloqueios", "plano_semana"], "owner": context.get("owner", "gerente_comercial")}


async def estimate_quarter_attainment(context: Dict[str, Any]) -> Dict[str, Any]:
    committed = float(context.get("committed", 500000))
    quota = float(context.get("quota", 700000))
    if quota <= 0:
        raise AgentToolError(code="INVALID_QUOTA", message="quota deve ser maior que zero")
    return {"attainment": round(committed / quota, 4)}
