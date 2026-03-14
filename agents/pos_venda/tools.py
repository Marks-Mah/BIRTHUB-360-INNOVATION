from __future__ import annotations

from pydantic import BaseModel, Field

from agents.shared.errors import AgentToolError


class HealthScoreInput(BaseModel):
    customer_id: str = Field(min_length=1)
    telemetry: dict = Field(default_factory=dict)


async def calculate_health_score(customer_id: str, telemetry: dict) -> dict:
    """Calculates customer health score from telemetry and usage behavior."""
    payload = HealthScoreInput(customer_id=customer_id, telemetry=telemetry)
    score = max(0, min(100, int(payload.telemetry.get('login_frequency', 50))))
    status = 'healthy' if score >= 70 else 'at_risk'
    return {"score": score, "status": status, "risk_factors": [], "playbook": "customer_recovery" if score < 70 else "growth"}


async def generate_onboarding_trail(user: dict, product: str) -> dict:
    """Creates onboarding plan and communication sequence for activation."""
    if not product:
        raise AgentToolError(code="INVALID_PRODUCT", message="product obrigatório")
    return {"steps": ["kickoff", "setup", "first-value"], "email_sequence": [f"Bem-vindo ao {product}"], "in_app_hints": ["Conecte integração principal"], "target_aha_moment": "Primeiro resultado em 7 dias"}


async def predict_churn_risk(customer: dict, behavior_history: dict) -> dict:
    """Predicts churn risk category and urgency from customer behavior."""
    risk = round(min(1, behavior_history.get('payment_delays',0)*0.1 + behavior_history.get('login_drop',0)*0.01),2)
    return {"risk_score": risk, "risk_category": "high" if risk>0.7 else "medium" if risk>0.4 else "low", "playbook": "salvage", "urgency": "high" if risk>0.7 else "normal"}


async def detect_upsell_opportunity(customer: dict, usage_data: dict) -> dict:
    """Detects expansion opportunities based on usage saturation signals."""
    return {"opportunities": [{"type":"seat_expansion","trigger":"90% de uso","recommended_plan":"Enterprise","draft_email":"Podemos expandir sua operação?"}]}


async def analyze_nps_response(response: dict) -> dict:
    """Classifies NPS respondent type and returns next CX action."""
    score = response.get('score',0)
    if not isinstance(score, int) or score < 0 or score > 10:
        raise AgentToolError(code="INVALID_NPS_SCORE", message="score deve estar entre 0 e 10")
    category = 'promoter' if score>=9 else 'passive' if score>=7 else 'detractor'
    return {"category": category, "sentiment": "positive" if category=='promoter' else "negative" if category=='detractor' else "neutral", "next_action": "open_crisis_ticket" if category=='detractor' else "ask_referral", "draft_message": "Obrigado pelo feedback"}


async def generate_renewal_campaign(customer: dict, days_before: int = 90) -> dict:
    """Builds renewal communication package ahead of renewal date."""
    if days_before < 1:
        raise AgentToolError(code="INVALID_DAYS_BEFORE", message="days_before deve ser >= 1")
    return {"roi_report": "ROI consolidado do período", "email_sequence": ["Resumo de resultados", "Próximos ganhos"], "renewal_date": customer.get('renewal_date','2026-01-01')}


async def deflect_support_ticket(ticket_content: str, knowledge_base: list) -> dict:
    """Attempts ticket deflection with knowledge-base answer suggestion."""
    if not ticket_content:
        raise AgentToolError(code="INVALID_TICKET", message="ticket_content obrigatório")
    return {"deflected": bool(knowledge_base), "solution": knowledge_base[0] if knowledge_base else "", "article_url": "https://kb.example.com/article", "confidence": 0.71 if knowledge_base else 0.2}


async def build_success_plan(customer: dict, objectives: list) -> dict:
    plan = [{"objective": o, "owner": customer.get("csm", "csm"), "due_in_days": 30} for o in objectives]
    return {"customer_id": customer.get("id"), "plan": plan}


async def orchestrate_qbr(customer: dict, period_metrics: dict) -> dict:
    return {"customer": customer.get("name"), "agenda": ["resultados", "benchmark", "roadmap"], "metrics": period_metrics}


async def calculate_adoption_index(usage: dict) -> dict:
    active = float(usage.get("active_users", 0))
    licensed = max(1.0, float(usage.get("licensed_users", 1)))
    depth = float(usage.get("feature_depth", 0.5))
    index = round((active / licensed) * 70 + depth * 30, 2)
    return {"adoption_index": index, "tier": "high" if index >= 75 else "medium" if index >= 50 else "low"}


async def detect_training_needs(team_usage: list) -> dict:
    needs = [u.get("team") for u in team_usage if float(u.get("completion_rate", 1)) < 0.7]
    return {"teams_needing_training": needs, "count": len(needs)}


async def generate_expansion_playbook(account: dict, opportunities: list) -> dict:
    return {"account": account.get("name"), "playbook": [{"opportunity": o.get("type"), "next_step": "executive_alignment"} for o in opportunities]}


async def monitor_sla_breach_risk(tickets: list) -> dict:
    at_risk = [t for t in tickets if float(t.get("hours_to_sla", 999)) < 4]
    return {"at_risk_tickets": at_risk, "risk_count": len(at_risk)}


async def design_advocacy_program(promoters: list) -> dict:
    return {"candidates": [p.get("account") for p in promoters], "tracks": ["case_study", "referral", "review_site"]}


async def compute_renewal_probability(account: dict, signals: dict) -> dict:
    base = 0.5
    base += 0.2 if signals.get("high_adoption") else 0
    base -= 0.3 if signals.get("open_escalations") else 0
    base += 0.1 if signals.get("executive_sponsor") else 0
    prob = max(0, min(1, base))
    return {"renewal_probability": round(prob, 2), "category": "secure" if prob >= 0.75 else "watch" if prob >= 0.5 else "risk"}


async def summarize_customer_voice(feedback_items: list) -> dict:
    themes = {}
    for f in feedback_items:
        theme = f.get("theme", "geral")
        themes[theme] = themes.get(theme, 0) + 1
    return {"themes": themes, "top_theme": max(themes, key=themes.get) if themes else None}


async def automate_playbook_assignment(accounts: list) -> dict:
    assignments = []
    for a in accounts:
        playbook = "recovery" if a.get("health", 100) < 60 else "growth"
        assignments.append({"account": a.get("name"), "playbook": playbook})
    return {"assignments": assignments}


async def map_customer_stakeholders(stakeholders: list) -> dict:
    mapped = [{"name": s.get("name"), "role": s.get("role"), "influence": s.get("influence", "medium")} for s in stakeholders]
    return {"stakeholders": mapped}


async def recommend_enablement_assets(use_cases: list) -> dict:
    assets = {u: [f"playbook_{u}", f"video_{u}"] for u in use_cases}
    return {"assets": assets}


async def build_escalation_plan(incident: dict, stakeholders: list) -> dict:
    return {"incident_id": incident.get("id"), "timeline": ["t+0 triagem", "t+2 atualização", "t+24 resolução"], "owners": stakeholders}


async def estimate_customer_lifetime_value(account: dict) -> dict:
    mrr = float(account.get("mrr", 0))
    gross_margin = float(account.get("gross_margin", 0.8))
    churn = max(0.01, float(account.get("monthly_churn", 0.03)))
    ltv = mrr * gross_margin / churn
    return {"ltv": round(ltv, 2)}


async def detect_contract_renewal_risks(contract: dict, usage_signals: dict) -> dict:
    risks = []
    if contract.get("days_to_renewal", 999) < 60 and not usage_signals.get("exec_alignment"):
        risks.append("no_exec_alignment")
    if usage_signals.get("adoption_drop_pct", 0) > 20:
        risks.append("adoption_drop")
    return {"risks": risks, "risk_level": "high" if len(risks) >= 2 else "medium" if risks else "low"}



async def validate_input(context: dict) -> dict:
    if not isinstance(context, dict):
        raise AgentToolError(code="INVALID_CONTEXT", message="context deve ser dict")
    return {"validated": True, "context": context}


async def process_domain(validated: dict) -> dict:
    context = validated.get("context", {})
    return {"domain": "pos-venda", "context": context, "validated": bool(validated.get("validated"))}


async def finalize(domain: dict) -> dict:
    return {"agent": "pos-venda", "summary": "pipeline_executed", "domain": domain.get("domain"), "context": domain.get("context", {})}
