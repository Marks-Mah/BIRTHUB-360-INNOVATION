from __future__ import annotations

from typing import Dict

COMMON_OPERATIONAL_CONTRACT = """\
Operational Contract (mandatory for every execution):
- Require tenant_id and request_id in every run context.
- If event-driven, require event_id and keep idempotent behavior.
- Validate payload before processing and return structured output with status/reason/next_action.
- Emit structured logs with trace_id and tenant context for observability.
- Use retry for recoverable failures and route irrecoverable failures to DLQ with root cause.
"""

AGENT_OPERATIONAL_PROFILES: Dict[str, Dict[str, str]] = {
    "bdr": {
        "inputs": "ICP, segment, territory, persona, allowed channels, daily contact cap.",
        "tools": "Lead finding, email verification, outreach sequencing.",
        "success": "Qualified lead with profile evidence, valid contact and ICP fit.",
        "metrics": "Qualification rate, bounce rate, time-to-first-reply.",
        "fallback": "If email/channel fails, switch channel and re-plan cadence.",
        "backlog": "I08, I10, I16, I20, M31, M33",
    },
    "closer": {
        "inputs": "Qualified opportunity, objection history, active commercial policy.",
        "tools": "Objection analysis, discount approval, contract drafting.",
        "success": "Valid stage progression or closed deal with explicit justification.",
        "metrics": "Win rate, average sales cycle, average discount band.",
        "fallback": "Escalate negotiation deadlocks with an approved alternative proposal.",
        "backlog": "I02, I05, I15, I16, M11, M12",
    },
    "sales_ops": {
        "inputs": "CRM snapshot, routing rules, forecast targets.",
        "tools": "CRM cleansing, revenue forecast, lead assignment.",
        "success": "No critical duplicate data and forecast within defined error band.",
        "metrics": "CRM completeness, forecast error, lead assignment SLA.",
        "fallback": "Block publish and route inconsistencies to reconciliation queue.",
        "backlog": "I01, I06, I08, I20, M14, M16",
    },
    "enablement": {
        "inputs": "Calls/transcripts, skill matrix, coaching objectives.",
        "tools": "Call analysis, coaching cards, training quizzes.",
        "success": "Actionable coaching plan with prioritized gaps.",
        "metrics": "Playbook adherence, competency evolution, training completion.",
        "fallback": "Reprocess low-quality transcripts and request human-assisted review.",
        "backlog": "I07, I20, M21, M33",
    },
    "kam": {
        "inputs": "Active portfolio, health score, stakeholders, expansion plan.",
        "tools": "Account planning, stakeholder mapping, QBR scheduling.",
        "success": "Updated account plan with risk/opportunity and approved next steps.",
        "metrics": "NRR by portfolio, churn risk mitigated, QBR coverage.",
        "fallback": "Request Sales Ops enrichment when account data is insufficient.",
        "backlog": "I03, I12, I13, I25, M46",
    },
    "partners": {
        "inputs": "Partner profile, commission policy, lead eligibility.",
        "tools": "Partner lead registration, commission calculation, collateral sharing.",
        "success": "Lead registered without conflict and auditable commission output.",
        "metrics": "Partner lead throughput, approval time, commission divergence.",
        "fallback": "Open ownership arbitration and block payout until decision.",
        "backlog": "I05, I16, I18, M12",
    },
    "field": {
        "inputs": "Visit agenda, territory, inventory state and daily priorities.",
        "tools": "Route optimization, visit reporting, inventory checks.",
        "success": "Visits completed with geo-time evidence and captured follow-ups.",
        "metrics": "Visits/day, route deviation, follow-up SLA.",
        "fallback": "Switch to offline mode and sync when connectivity is restored.",
        "backlog": "I18, I20, M22, M41",
    },
    "pre_sales": {
        "inputs": "Technical scope, functional/non-functional requirements, response deadline.",
        "tools": "Demo generation, RFP answers, feasibility checks.",
        "success": "Technically coherent proposal with explicit risks.",
        "metrics": "RFP response time, technical approval rate, proposal rework.",
        "fallback": "Return structured clarification checklist for ambiguous requirements.",
        "backlog": "I09, I11, M15, M20",
    },
    "copywriter": {
        "inputs": "Campaign objective, audience, channel, tone of voice, compliance.",
        "tools": "Script generation, email rewriting, social post creation.",
        "success": "Brand-aligned copy with clear CTA and risk review.",
        "metrics": "CTR, reply rate, content compliance score.",
        "fallback": "Block risky outputs (PII/toxicity/claims) and escalate to human review.",
        "backlog": "M29, M30, M31, M33",
    },
    "social": {
        "inputs": "Target accounts, weekly topics, engagement criteria.",
        "tools": "Profile discovery, post commenting, connection requests.",
        "success": "Qualified engagement without violating platform policies.",
        "metrics": "Accepted connection rate, qualified interactions, conversations started.",
        "fallback": "Reduce cadence and reschedule queue on platform rate limits.",
        "backlog": "I08, I17, I20, M24",
    },
}


def build_operational_appendix(agent_key: str) -> str:
    profile = AGENT_OPERATIONAL_PROFILES[agent_key]
    return (
        "\n\nExecution Playbook Alignment:\n"
        f"{COMMON_OPERATIONAL_CONTRACT}\n"
        f"- Agent Inputs: {profile['inputs']}\n"
        f"- Primary Tools: {profile['tools']}\n"
        f"- Success Criteria: {profile['success']}\n"
        f"- Operational Metrics: {profile['metrics']}\n"
        f"- Fallback Behavior: {profile['fallback']}\n"
        f"- Backlog Alignment: {profile['backlog']}\n"
    )
