from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel, Field

from agents.shared.errors import AgentToolError


class MarketOpportunityInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class OutboundTargetInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class EntryStrategyInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class BusinessCaseInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


async def map_new_market_opportunities(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = MarketOpportunityInput(context=context)
    score = min(100, max(0, int(payload.context.get("lead_score", 70))))
    profile = payload.context.get("profile", "mid_market")
    return {
        "summary": f"Diagnóstico inicial para perfil {profile}",
        "score": score,
        "priority": "high" if score >= 80 else "medium" if score >= 60 else "low",
    }


async def score_outbound_targets(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = OutboundTargetInput(context=context)
    win_signals = int(payload.context.get("win_signals", 3))
    risk_signals = int(payload.context.get("risk_signals", 1))
    value = max(0, min(100, 60 + (win_signals * 8) - (risk_signals * 10)))
    return {
        "index": value,
        "classification": "strong" if value >= 75 else "stable" if value >= 55 else "fragile",
        "drivers": {"win_signals": win_signals, "risk_signals": risk_signals},
    }


async def build_entry_strategy(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = EntryStrategyInput(context=context)
    owner = payload.context.get("owner", "comercial")
    steps: List[Dict[str, Any]] = [
        {"step": "diagnostico", "owner": owner, "eta_days": 2},
        {"step": "execucao", "owner": owner, "eta_days": 5},
        {"step": "revisao", "owner": owner, "eta_days": 2},
    ]
    return {"steps": steps, "count": len(steps)}


async def estimate_business_case(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = BusinessCaseInput(context=context)
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
async def assess_market_whitespace(context: Dict[str, Any]) -> Dict[str, Any]:
    tam = float(context.get("tam", 1_000_000))
    served = float(context.get("served_market", 350_000))
    return {"whitespace": round(max(0.0, tam - served), 2)}


async def prioritize_verticals(context: Dict[str, Any]) -> Dict[str, Any]:
    verticals = context.get("verticals", ["saude", "educacao", "varejo"])
    return {"prioritized": sorted(verticals)[:3]}


async def simulate_channel_mix(context: Dict[str, Any]) -> Dict[str, Any]:
    inbound = float(context.get("inbound", 0.4))
    outbound = float(context.get("outbound", 0.4))
    partner = float(context.get("partner", 0.2))
    total = inbound + outbound + partner
    return {"mix": {"inbound": inbound, "outbound": outbound, "partner": partner}, "normalized": round(total, 2)}


async def generate_board_update(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"sections": ["crescimento", "risco", "iniciativas"], "periodo": context.get("periodo", "mensal")}


async def estimate_new_logo_capacity(context: Dict[str, Any]) -> Dict[str, Any]:
    reps = int(context.get("hunters", 4))
    productivity = int(context.get("logos_por_rep", 2))
    return {"new_logos": reps * productivity}


async def score_geo_expansion_risk(context: Dict[str, Any]) -> Dict[str, Any]:
    regulation = int(context.get("regulatory_complexity", 50))
    competition = int(context.get("competition", 50))
    return {"risk_score": round((regulation + competition) / 2, 2)}


async def estimate_partnership_roi(context: Dict[str, Any]) -> Dict[str, Any]:
    expected_revenue = float(context.get("expected_revenue", 0))
    cost = float(context.get("cost", 0))
    if cost <= 0:
        raise AgentToolError(code="INVALID_COST", message="cost deve ser maior que zero")
    return {"roi": round((expected_revenue - cost) / cost, 2), "expected_revenue": expected_revenue, "cost": cost}
