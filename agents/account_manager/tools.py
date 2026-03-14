from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel, Field

from agents.shared.errors import AgentToolError


class AccountHealthInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class ExpansionPathInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class QBRInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class NrrInput(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


async def assess_account_health(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = AccountHealthInput(context=context)
    score = min(100, max(0, int(payload.context.get("lead_score", 70))))
    profile = payload.context.get("profile", "mid_market")
    return {
        "summary": f"Diagnóstico inicial para perfil {profile}",
        "score": score,
        "priority": "high" if score >= 80 else "medium" if score >= 60 else "low",
    }


async def identify_expansion_paths(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = ExpansionPathInput(context=context)
    win_signals = int(payload.context.get("win_signals", 3))
    risk_signals = int(payload.context.get("risk_signals", 1))
    value = max(0, min(100, 60 + (win_signals * 8) - (risk_signals * 10)))
    return {
        "index": value,
        "classification": "strong" if value >= 75 else "stable" if value >= 55 else "fragile",
        "drivers": {"win_signals": win_signals, "risk_signals": risk_signals},
    }


async def build_qbr_plan(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = QBRInput(context=context)
    owner = payload.context.get("owner", "comercial")
    steps: List[Dict[str, Any]] = [
        {"step": "diagnostico", "owner": owner, "eta_days": 2},
        {"step": "execucao", "owner": owner, "eta_days": 5},
        {"step": "revisao", "owner": owner, "eta_days": 2},
    ]
    return {"steps": steps, "count": len(steps)}


async def estimate_net_revenue_retention(context: Dict[str, Any]) -> Dict[str, Any]:
    payload = NrrInput(context=context)
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
async def prioritize_renewal_risks(context: Dict[str, Any]) -> Dict[str, Any]:
    churn_signals = int(context.get("churn_signals", 0))
    usage_score = int(context.get("usage_score", 75))
    risk_score = max(0, min(100, churn_signals * 15 + (100 - usage_score)))
    return {"risk_score": risk_score, "priority": "urgent" if risk_score >= 70 else "watch"}


async def recommend_success_playbook(context: Dict[str, Any]) -> Dict[str, Any]:
    segment = context.get("segment", "mid_market")
    return {
        "segment": segment,
        "playbook": ["kickoff_executivo", "cadencia_valor_quinzenal", "revisao_resultados_mensal"],
    }


async def generate_stakeholder_map(context: Dict[str, Any]) -> Dict[str, Any]:
    stakeholders = context.get("stakeholders", [])
    mapped = [{"name": s.get("name", "n/a"), "influence": s.get("influence", "medium")} for s in stakeholders]
    return {"total": len(mapped), "stakeholders": mapped}


async def calculate_expansion_readiness(context: Dict[str, Any]) -> Dict[str, Any]:
    adoption = float(context.get("adoption", 0.7))
    satisfaction = float(context.get("satisfaction", 0.75))
    readiness = round(max(0.0, min(1.0, (adoption * 0.5) + (satisfaction * 0.5))), 4)
    return {"readiness": readiness, "tier": "ready" if readiness >= 0.75 else "developing"}


async def build_exec_business_review(context: Dict[str, Any]) -> Dict[str, Any]:
    outcomes = context.get("outcomes", ["eficiencia", "crescimento", "retencao"])
    return {"agenda": ["resultados", "riscos", "plano_90_dias"], "outcomes": outcomes}


async def project_upsell_revenue(context: Dict[str, Any]) -> Dict[str, Any]:
    pipeline = float(context.get("upsell_pipeline", 50000))
    conversion = float(context.get("conversion", 0.3))
    if not 0 <= conversion <= 1:
        raise AgentToolError(code="INVALID_CONVERSION", message="conversion deve estar entre 0 e 1")
    return {"projected_upsell": round(pipeline * conversion, 2), "conversion": conversion}
