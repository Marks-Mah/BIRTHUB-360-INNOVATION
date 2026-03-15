from typing import Dict, Any, List
from agents.shared.tool_runtime import run_tool

async def _register_partner_lead(partner_id: str, lead_details: Dict[str, Any]) -> Dict[str, Any]:
    # Mock registration
    return {
        "registration_id": "REG-999",
        "status": "approved",
        "expiration_date": "2023-12-31",
        "conflict_check": "passed"
    }

async def register_partner_lead(partner_id: str, lead_details: Dict[str, Any]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="partners.register_partner_lead",
        handler=_register_partner_lead,
        payload={"partner_id": partner_id, "lead_details": lead_details},
        idempotent=True,
    )

async def _calculate_partner_commission(deal_value: float, partner_tier: str) -> Dict[str, Any]:
    # Mock calc
    rate = 0.20 if partner_tier == "Gold" else 0.10
    commission = deal_value * rate
    return {
        "deal_value": deal_value,
        "tier": partner_tier,
        "rate": rate,
        "commission_amount": commission
    }

async def calculate_partner_commission(deal_value: float, partner_tier: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="partners.calculate_partner_commission",
        handler=_calculate_partner_commission,
        payload={"deal_value": deal_value, "partner_tier": partner_tier},
        idempotent=True,
    )

async def _share_collateral(partner_email: str, resource_type: str) -> Dict[str, Any]:
    # Mock share
    return {
        "sent_to": partner_email,
        "resources": [f"{resource_type}_deck.pdf", f"{resource_type}_one_pager.pdf"],
        "tracking_link": "https://portal.birthub.com/s/123"
    }

async def share_collateral(partner_email: str, resource_type: str) -> Dict[str, Any]:
    return await run_tool(
        tool_name="partners.share_collateral",
        handler=_share_collateral,
        payload={"partner_email": partner_email, "resource_type": resource_type},
        idempotent=True,
    )


async def score_partner_pipeline(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"pipeline_score": min(100, int(context.get("pipeline_score", 73)))}


async def recommend_partner_enablement(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"enablement": ["deck", "battlecard", "demo_env"], "track": context.get("track", "growth")}


async def summarize_partner_activity(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {"activities": len(items), "active": sum(1 for item in items if item.get("active", True))}


async def build_partner_follow_up(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"sequence": ["intro", "follow_up", "qbr"], "owner": context.get("owner", "partner_manager")}
