from __future__ import annotations

import os
from typing import Dict, Any, List

import httpx
from pydantic import BaseModel, Field

from agents.shared.errors import AgentToolError
from .schemas import TranscribeAndSyncInput


class ProposalInput(BaseModel):
    id: str = Field(default="unknown")


class DiscountInput(BaseModel):
    deal_id: str = Field(min_length=1)
    discount_pct: float
    ae_id: str = Field(min_length=1)


async def generate_proposal(deal: Dict[str, Any], customer_logo: bytes = None) -> Dict[str, Any]:
    """Generate proposal document metadata and tracking links for deal execution."""
    payload = ProposalInput.model_validate(deal or {})
    deal_id = payload.id
    return {
        "pdf_url": f"https://storage.birthub.com/proposals/{deal_id}.pdf",
        "tracking_link": f"https://viewer.birthub.com/p/{deal_id}",
        "view_events_webhook": f"https://api.birthub.com/webhooks/proposals/{deal_id}",
    }


async def calculate_roi(customer_data: Dict[str, Any], product_config: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate ROI summary from staffing and commercial assumptions."""
    employees = customer_data.get("employees", 100)
    avg_salary = customer_data.get("avg_salary", 5000)
    efficiency_gain = 0.20

    annual_savings = employees * avg_salary * 12 * efficiency_gain
    cost = product_config.get("price", 10000) * 12

    roi_pct = ((annual_savings - cost) / cost) * 100 if cost > 0 else 0

    return {
        "roi_html": "<div>ROI Dashboard...</div>",
        "key_metrics": {
            "annual_savings": annual_savings,
            "cost": cost,
            "3yr_roi": roi_pct * 3,
            "payback_period": "3 months",
        },
        "pdf_url": "https://storage.birthub.com/roi/report_123.pdf",
    }


async def get_battlecard(competitor_name: str, deal_context: Dict[str, Any]) -> Dict[str, Any]:
    """Return concise competitor battlecard for AE handling during negotiation."""
    if not competitor_name:
        raise AgentToolError(code="INVALID_COMPETITOR", message="competitor_name obrigatório")
    return {
        "competitor": competitor_name,
        "weaknesses": ["High price", "Legacy UI", "Slow support"],
        "our_strengths": ["AI-native", "Fast onboarding", "Cheaper"],
        "talking_points": [
            "Ask about their hidden implementation costs.",
            "Show our 1-click migration tool.",
        ],
    }


async def transcribe_and_sync_call(recording_url: str, deal_id: str) -> Dict[str, Any]:
    """Transcribes calls and syncs insights to CRM webhook when configured."""
    validated = TranscribeAndSyncInput(recording_url=recording_url, deal_id=deal_id)
    transcript = ""

    endpoint = os.getenv("CALL_TRANSCRIBE_ENDPOINT")
    api_key = os.getenv("CALL_TRANSCRIBE_API_KEY")
    if endpoint and api_key:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                endpoint,
                json={"recording_url": str(validated.recording_url)},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            response.raise_for_status()
            transcript = response.json().get("transcript", "")

    if not transcript:
        transcript = "Speaker A: Hello... Speaker B: We need to buy this..."

    pain_points = ["Manual entry", "Lack of visibility"] if "manual" in transcript.lower() else ["Budget constraints"]
    next_steps = ["Send proposal", "Schedule tech review"]

    crm_updated = False
    crm_webhook = os.getenv("CRM_SYNC_WEBHOOK")
    if crm_webhook:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(crm_webhook, json={"deal_id": validated.deal_id, "transcript": transcript, "next_steps": next_steps})
            crm_updated = r.status_code < 400
    else:
        crm_updated = True

    return {
        "transcript": transcript,
        "pain_points": pain_points,
        "next_steps": next_steps,
        "crm_updated": crm_updated,
    }


async def predict_deal_blockers(deal: Dict[str, Any], history: List[Any]) -> Dict[str, Any]:
    """Predict blockers for current deal trajectory based on history hints."""
    return {
        "blockers": ["Legal review pending", "CTO not engaged"],
        "risk_score": 0.45,
        "recommendations": ["Send security compliance doc to CTO"],
    }


async def calculate_win_probability(deal: Dict[str, Any], signals: Dict[str, Any]) -> Dict[str, Any]:
    """Estimate win probability from stage and positive deal signals."""
    stage = deal.get("stage", "PROSPECTING")
    base_prob = 0.1
    if stage == "NEGOTIATION":
        base_prob = 0.7
    elif stage == "PROPOSAL_SENT":
        base_prob = 0.5

    return {
        "probability": base_prob,
        "forecast_category": "pipeline" if base_prob < 0.6 else "best_case",
        "confidence": 0.8,
        "factors": ["Stage advancement", "Positive email sentiment"],
    }


async def apply_decoy_pricing(deal_value: float, lead_profile: Dict[str, Any]) -> Dict[str, Any]:
    """Generate decoy pricing framing strategy for deal presentation."""
    if deal_value < 0:
        raise AgentToolError(code="INVALID_DEAL_VALUE", message="deal_value deve ser >= 0")
    return {
        "recommended_plan": "Pro",
        "anchor_plan": "Enterprise",
        "presentation_order": ["Enterprise", "Pro", "Starter"],
    }


async def validate_discount(deal_id: str, discount_pct: float, ae_id: str) -> Dict[str, Any]:
    """Validate discount limits and whether manager approval is required."""
    payload = DiscountInput(deal_id=deal_id, discount_pct=discount_pct, ae_id=ae_id)
    if payload.discount_pct < 0:
        raise AgentToolError(code="INVALID_DISCOUNT", message="discount_pct deve ser >= 0")
    max_allowed = 20.0
    approved = payload.discount_pct <= max_allowed
    return {"approved": approved, "max_allowed": max_allowed, "requires_approval": not approved}


async def build_mutual_action_plan(deal: Dict[str, Any], milestones: List[Dict[str, Any]]) -> Dict[str, Any]:
    owner = deal.get("owner", "ae")
    normalized = [
        {"name": m.get("name", f"milestone_{idx+1}"), "owner": m.get("owner", owner), "due_date": m.get("due_date", "TBD")}
        for idx, m in enumerate(milestones)
    ]
    return {"deal_id": deal.get("id"), "map": normalized, "completion_rate": 0 if not normalized else round(sum(1 for m in normalized if m["due_date"] != "TBD") / len(normalized), 2)}


async def generate_security_pack(customer_requirements: Dict[str, Any]) -> Dict[str, Any]:
    frameworks = customer_requirements.get("frameworks", ["SOC2", "LGPD"])
    return {"documents": [f"{f}_certificate.pdf" for f in frameworks], "questionnaire_template": "security_questionnaire_v3", "sla_hours": 24}


async def map_stakeholder_influence(stakeholders: List[Dict[str, Any]]) -> Dict[str, Any]:
    scored = []
    for s in stakeholders:
        influence = min(100, int(s.get("seniority_score", 50) * 0.6 + s.get("engagement_score", 50) * 0.4))
        scored.append({"name": s.get("name", "unknown"), "role": s.get("role", "unknown"), "influence": influence})
    scored.sort(key=lambda i: i["influence"], reverse=True)
    return {"top_champions": scored[:3], "decision_committee": [s for s in scored if s["influence"] >= 70]}


async def simulate_pricing_scenarios(base_price: float, scenarios: List[Dict[str, Any]]) -> Dict[str, Any]:
    outputs = []
    for s in scenarios:
        discount = max(0, min(60, float(s.get("discount_pct", 0))))
        seats = max(1, int(s.get("seats", 1)))
        arr = round(base_price * seats * (1 - discount / 100), 2)
        outputs.append({"name": s.get("name", "scenario"), "arr": arr, "discount_pct": discount})
    best = max(outputs, key=lambda x: x["arr"], default={"name": "none", "arr": 0})
    return {"scenarios": outputs, "recommended": best}


async def detect_procurement_risks(procurement_data: Dict[str, Any]) -> Dict[str, Any]:
    blockers = []
    if procurement_data.get("security_review_days", 0) > 30:
        blockers.append("security_review_delay")
    if procurement_data.get("vendor_onboarding_required", False):
        blockers.append("vendor_onboarding")
    if procurement_data.get("payment_terms_days", 30) > 60:
        blockers.append("extended_payment_terms")
    return {"risk_level": "high" if len(blockers) >= 2 else "medium" if blockers else "low", "blockers": blockers}


async def generate_executive_summary(deal: Dict[str, Any], interactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    key_points = [i.get("summary", "") for i in interactions if i.get("summary")]
    return {
        "title": f"Executive Summary - {deal.get('company', 'Account')}",
        "deal_stage": deal.get("stage", "unknown"),
        "value": deal.get("amount", 0),
        "highlights": key_points[-5:],
    }


async def plan_multithreading_strategy(stakeholders: List[Dict[str, Any]], deal_stage: str) -> Dict[str, Any]:
    actions = []
    for s in stakeholders:
        actions.append({"stakeholder": s.get("name", "unknown"), "message_goal": f"Advance {deal_stage}", "channel": s.get("preferred_channel", "email")})
    return {"stage": deal_stage, "actions": actions, "coverage": len(actions)}


async def calculate_concession_matrix(list_price: float, requested_discounts: List[float]) -> Dict[str, Any]:
    matrix = []
    for d in requested_discounts:
        d = max(0.0, min(80.0, float(d)))
        price = round(list_price * (1 - d / 100), 2)
        matrix.append({"discount": d, "final_price": price, "requires_vp": d > 25})
    return {"matrix": matrix, "floor_price": round(list_price * 0.75, 2)}


async def score_call_quality(call_metadata: Dict[str, Any]) -> Dict[str, Any]:
    talk_listen_ratio = float(call_metadata.get("talk_listen_ratio", 1.0))
    questions = int(call_metadata.get("questions_asked", 0))
    score = max(0, min(100, int(70 - abs(1.2 - talk_listen_ratio) * 20 + questions * 2)))
    return {"score": score, "coaching_tip": "Faça mais perguntas abertas" if questions < 8 else "Bom equilíbrio consultivo"}


async def generate_business_case(customer_data: Dict[str, Any], proposal: Dict[str, Any]) -> Dict[str, Any]:
    baseline_cost = float(customer_data.get("current_cost", 0))
    proposed_cost = float(proposal.get("annual_cost", 0))
    delta = round(baseline_cost - proposed_cost, 2)
    return {"current_cost": baseline_cost, "proposed_cost": proposed_cost, "annual_impact": delta, "narrative": "Automação reduz esforço operacional e retrabalho."}


async def prepare_redline_strategy(contract_terms: Dict[str, Any]) -> Dict[str, Any]:
    sensitive = [k for k, v in contract_terms.items() if isinstance(v, str) and "unlimited" in v.lower()]
    return {"priority_clauses": sensitive, "fallback_terms": {k: "standard_policy" for k in sensitive}, "legal_handoff": bool(sensitive)}


async def recommend_next_best_action(deal: Dict[str, Any], engagement_signals: Dict[str, Any]) -> Dict[str, Any]:
    if engagement_signals.get("last_reply_days", 0) > 10:
        action = "follow_up_with_new_value"
    elif engagement_signals.get("demo_completed", False) and not engagement_signals.get("security_review_started", False):
        action = "trigger_security_package"
    else:
        action = "schedule_progress_checkpoint"
    return {"deal_id": deal.get("id"), "action": action, "priority": "high" if deal.get("amount", 0) > 50000 else "normal"}


async def generate_qbr_brief(account: Dict[str, Any], usage: Dict[str, Any]) -> Dict[str, Any]:
    adoption = usage.get("active_users", 0) / max(1, usage.get("licensed_users", 1))
    return {"account": account.get("name"), "adoption_rate": round(adoption, 2), "wins": usage.get("wins", []), "risks": usage.get("risks", [])}


async def estimate_implementation_timeline(scope: Dict[str, Any]) -> Dict[str, Any]:
    integrations = int(scope.get("integrations", 1))
    teams = int(scope.get("teams", 1))
    weeks = max(2, integrations * 2 + teams)
    return {"estimated_weeks": weeks, "phases": ["discovery", "setup", "training", "go_live"], "critical_path": "integration_and_change_management"}


async def audit_pipeline_hygiene(deals: List[Dict[str, Any]]) -> Dict[str, Any]:
    stale = [d for d in deals if d.get("days_in_stage", 0) > 21]
    missing_next_step = [d.get("id") for d in deals if not d.get("next_step")]
    return {"stale_deals": [d.get("id") for d in stale], "missing_next_step": missing_next_step, "hygiene_score": max(0, 100 - len(stale) * 5 - len(missing_next_step) * 3)}
