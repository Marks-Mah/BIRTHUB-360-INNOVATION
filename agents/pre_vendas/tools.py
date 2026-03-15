from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel, Field

from agents.shared.errors import AgentToolError


class DiscoveryInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class QualificationScoreInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class NextStepInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class FitRiskInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


async def qualify_discovery(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = DiscoveryInput(context=context)
    score = min(100, max(0, int(payload.context.get("lead_score", 70))))
    profile = payload.context.get("profile", "mid_market")
    return {
        "summary": f"Diagnóstico inicial para perfil {profile}",
        "score": score,
        "priority": "high" if score >= 80 else "medium" if score >= 60 else "low",
    }


async def build_qualification_score(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = QualificationScoreInput(context=context)
    win_signals = int(payload.context.get("win_signals", 3))
    risk_signals = int(payload.context.get("risk_signals", 1))
    value = max(0, min(100, 60 + (win_signals * 8) - (risk_signals * 10)))
    return {
        "index": value,
        "classification": "strong" if value >= 75 else "stable" if value >= 55 else "fragile",
        "drivers": {"win_signals": win_signals, "risk_signals": risk_signals},
    }


async def generate_next_step_plan(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = NextStepInput(context=context)
    owner = payload.context.get("owner", "comercial")
    steps: List[Dict[str, Any]] = [
        {"step": "diagnostico", "owner": owner, "eta_days": 2},
        {"step": "execucao", "owner": owner, "eta_days": 5},
        {"step": "revisao", "owner": owner, "eta_days": 2},
    ]
    return {"steps": steps, "count": len(steps)}


async def estimate_fit_risk(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = FitRiskInput(context=context)
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
async def generate_discovery_questionnaire(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"questions": ["objetivo_90_dias", "processo_atual", "criterios_de_sucesso"]}


async def estimate_qualification_score(context: Dict[str, Any]) -> Dict[str, Any]:
    budget = int(context.get("budget_fit", 70))
    authority = int(context.get("authority", 70))
    need = int(context.get("need", 75))
    timing = int(context.get("timing", 65))
    return {"score": round((budget + authority + need + timing) / 4, 2)}


async def detect_objection_patterns(context: Dict[str, Any]) -> Dict[str, Any]:
    objections = context.get("objections", [])
    return {"top_objections": sorted(objections)[:3], "count": len(objections)}


async def recommend_discovery_assets(context: Dict[str, Any]) -> Dict[str, Any]:
    segment = context.get("segment", "b2b")
    return {"segment": segment, "assets": ["case_study", "roi_calculator", "benchmark"]}


async def summarize_discovery_call(context: Dict[str, Any]) -> Dict[str, Any]:
    notes = context.get("notes", "")
    return {"summary": notes[:220], "next_step": context.get("next_step", "agendar_demonstracao")}


async def plan_handoff_to_ae(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"handoff_fields": ["dor", "impacto", "stakeholders", "timeline"], "ready": True}


async def calculate_discovery_coverage(context: Dict[str, Any]) -> Dict[str, Any]:
    answered = max(0, int(context.get("answered_questions", 0)))
    total = max(1, int(context.get("total_questions", 1)))
    return {"coverage": round(answered / total, 4), "answered_questions": answered, "total_questions": total}
