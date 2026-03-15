from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel, Field

from agents.shared.errors import AgentToolError


class OfferInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class DiscountGuardrailInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class FollowupInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class DealReadinessInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


async def prepare_offer(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = OfferInput(context=context)
    score = min(100, max(0, int(payload.context.get("lead_score", 70))))
    profile = payload.context.get("profile", "mid_market")
    return {
        "summary": f"Diagnóstico inicial para perfil {profile}",
        "score": score,
        "priority": "high" if score >= 80 else "medium" if score >= 60 else "low",
    }


async def simulate_discount_guardrail(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = DiscountGuardrailInput(context=context)
    win_signals = int(payload.context.get("win_signals", 3))
    risk_signals = int(payload.context.get("risk_signals", 1))
    value = max(0, min(100, 60 + (win_signals * 8) - (risk_signals * 10)))
    return {
        "index": value,
        "classification": "strong" if value >= 75 else "stable" if value >= 55 else "fragile",
        "drivers": {"win_signals": win_signals, "risk_signals": risk_signals},
    }


async def build_followup_sequence(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = FollowupInput(context=context)
    owner = payload.context.get("owner", "comercial")
    steps: List[Dict[str, Any]] = [
        {"step": "diagnostico", "owner": owner, "eta_days": 2},
        {"step": "execucao", "owner": owner, "eta_days": 5},
        {"step": "revisao", "owner": owner, "eta_days": 2},
    ]
    return {"steps": steps, "count": len(steps)}


async def calculate_deal_readiness(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = DealReadinessInput(context=context)
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
async def enrich_lead_context(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"enriched": True, "firmographic_fields": ["segmento", "porte", "regiao"]}


async def prioritize_callback_queue(context: Dict[str, Any]) -> Dict[str, Any]:
    waiting = context.get("waiting", [5, 20, 10])
    return {"sorted_waiting_minutes": sorted(waiting)}


async def detect_recontact_window(context: Dict[str, Any]) -> Dict[str, Any]:
    hours = int(context.get("hours_since_last_touch", 24))
    return {"recommended": "now" if hours >= 24 else "later", "hours": hours}


async def generate_contact_script(context: Dict[str, Any]) -> Dict[str, Any]:
    persona = context.get("persona", "gestor_comercial")
    return {"opening": f"Olá {persona}, vi oportunidades no seu processo.", "cta": "Podemos agendar 15 minutos?"}


async def score_inbound_hotness(context: Dict[str, Any]) -> Dict[str, Any]:
    intent = int(context.get("intent", 60))
    fit = int(context.get("fit", 70))
    return {"hotness": round((intent * 0.6) + (fit * 0.4), 2)}


async def build_followup_sequence(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"sequence": ["dia0_call", "dia1_whatsapp", "dia3_email", "dia5_call"]}


async def calculate_speed_to_lead(context: Dict[str, Any]) -> Dict[str, Any]:
    first_touch_minutes = max(0, float(context.get("first_touch_minutes", 0)))
    return {"first_touch_minutes": first_touch_minutes, "sla_met": first_touch_minutes <= 15}
