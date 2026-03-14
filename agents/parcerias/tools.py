from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel, Field

from agents.shared.errors import AgentToolError


class PartnerFitInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class PartnerPlanInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class PartnerPipelineInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class EnablementInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


async def score_partner_fit(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = PartnerFitInput(context=context)
    score = min(100, max(0, int(payload.context.get("lead_score", 70))))
    profile = payload.context.get("profile", "mid_market")
    return {
        "summary": f"Diagnóstico inicial para perfil {profile}",
        "score": score,
        "priority": "high" if score >= 80 else "medium" if score >= 60 else "low",
    }


async def build_partner_plan(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = PartnerPlanInput(context=context)
    win_signals = int(payload.context.get("win_signals", 3))
    risk_signals = int(payload.context.get("risk_signals", 1))
    value = max(0, min(100, 60 + (win_signals * 8) - (risk_signals * 10)))
    return {
        "index": value,
        "classification": "strong" if value >= 75 else "stable" if value >= 55 else "fragile",
        "drivers": {"win_signals": win_signals, "risk_signals": risk_signals},
    }


async def estimate_partner_pipeline(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = PartnerPipelineInput(context=context)
    owner = payload.context.get("owner", "comercial")
    steps: List[Dict[str, Any]] = [
        {"step": "diagnostico", "owner": owner, "eta_days": 2},
        {"step": "execucao", "owner": owner, "eta_days": 5},
        {"step": "revisao", "owner": owner, "eta_days": 2},
    ]
    return {"steps": steps, "count": len(steps)}


async def generate_enablement_pack(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = EnablementInput(context=context)
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
async def identify_partner_tiers(context: Dict[str, Any]) -> Dict[str, Any]:
    partners = context.get("partners", [])
    return {"tiers": [{"partner": p.get("name", "n/a"), "tier": p.get("tier", "silver")} for p in partners]}


async def calculate_partner_influence(context: Dict[str, Any]) -> Dict[str, Any]:
    sourced = float(context.get("sourced_revenue", 100000))
    assisted = float(context.get("assisted_revenue", 50000))
    return {"influence_index": round((sourced * 0.7) + (assisted * 0.3), 2)}


async def plan_co_marketing_calendar(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"activities": ["webinar", "ebook", "case_conjunto"], "quarter": context.get("quarter", "Q1")}


async def evaluate_partner_health(context: Dict[str, Any]) -> Dict[str, Any]:
    nps = float(context.get("nps", 55))
    return {"health": "good" if nps >= 50 else "recover", "nps": nps}


async def suggest_mdf_allocation(context: Dict[str, Any]) -> Dict[str, Any]:
    mdf = float(context.get("mdf_budget", 20000))
    return {"allocation": {"top_partners": round(mdf * 0.6, 2), "growth_partners": round(mdf * 0.4, 2)}}


async def generate_partner_qbr(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"sections": ["pipeline", "won_revenue", "next_quarter_plan"], "partner": context.get("partner", "default_partner")}
async def track_partner_activation(context: Dict[str, Any]) -> Dict[str, Any]:
    activated = int(context.get("activated", 4))
    invited = max(1, int(context.get("invited", 10)))
    return {"activation_rate": round(activated / invited, 4)}


async def build_partner_recovery_plan(context: Dict[str, Any]) -> Dict[str, Any]:
    issue = context.get("issue", "baixo_pipeline")
    return {"issue": issue, "plan": ["treinamento", "campanha_coop", "revisao_meta"]}
