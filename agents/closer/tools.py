from typing import Dict, Any, List
from agents.shared.tool_runtime import run_tool

async def _analyze_objections(conversation_history: List[str]) -> Dict[str, Any]:
    # Mock analysis
    return {
        "primary_objection": "Price",
        "confidence": 0.85,
        "strategy": "Emphasize ROI and offer payment terms"
    }

async def analyze_objections(conversation_history: List[str]) -> Dict[str, Any]:
    return await run_tool(
        tool_name="closer.analyze_objections",
        handler=_analyze_objections,
        payload={"conversation_history": conversation_history},
        idempotent=True,
    )

async def _calculate_discount_approval(deal_value: float, requested_discount: float) -> Dict[str, Any]:
    # Mock logic
    max_discount = 0.15 # 15%
    approved = requested_discount <= max_discount
    return {
        "approved": approved,
        "max_approved_discount": max_discount,
        "requested": requested_discount,
        "deal_value": deal_value
    }

async def calculate_discount_approval(deal_value: float, requested_discount: float) -> Dict[str, Any]:
    return await run_tool(
        tool_name="closer.calculate_discount_approval",
        handler=_calculate_discount_approval,
        payload={"deal_value": deal_value, "requested_discount": requested_discount},
        idempotent=True,
    )

async def _generate_contract_draft(deal_details: Dict[str, Any]) -> Dict[str, Any]:
    # Mock contract generation
    return {
        "contract_url": "https://contracts.birthub.com/draft/123",
        "terms": deal_details.get("terms", "Standard"),
        "value": deal_details.get("value", 0),
        "status": "draft"
    }
async def draft_mutual_action_plan(context: Dict[str, Any]) -> Dict[str, Any]:
    owner = context.get("owner", "ae")
    return {"owner": owner, "milestones": ["valida_juridico", "alinha_financeiro", "fecha_assinatura"]}


async def map_decision_committee(context: Dict[str, Any]) -> Dict[str, Any]:
    members = context.get("committee", [])
    return {"count": len(members), "critical_roles": [m.get("role", "unknown") for m in members]}


async def estimate_discount_impact(context: Dict[str, Any]) -> Dict[str, Any]:
    deal_value = float(context.get("deal_value", 100000))
    discount_pct = float(context.get("discount_pct", 0.1))
    if discount_pct < 0 or discount_pct > 0.5:
        raise AgentToolError(code="INVALID_DISCOUNT", message="discount_pct deve estar entre 0 e 0.5")
    return {"net_value": round(deal_value * (1 - discount_pct), 2), "discount_pct": discount_pct}


async def prepare_negotiation_brief(context: Dict[str, Any]) -> Dict[str, Any]:
    return {"anchors": ["roi", "prazo_implantacao", "suporte"], "fallback": context.get("fallback", "parcelamento")}


async def generate_concession_matrix(context: Dict[str, Any]) -> Dict[str, Any]:
    asks = context.get("customer_asks", ["desconto", "sla"])
    return {"matrix": [{"ask": ask, "give": "contrapartida_contrato_12m"} for ask in asks]}


async def assess_legal_readiness(context: Dict[str, Any]) -> Dict[str, Any]:
    pendencias = int(context.get("legal_pending", 0))
    return {"legal_pending": pendencias, "status": "ready" if pendencias == 0 else "pending"}
