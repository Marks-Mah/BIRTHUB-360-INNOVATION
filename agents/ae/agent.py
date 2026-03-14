from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.ae.prompts import AE_AGENT_SYSTEM
from agents.ae.cadence_engine import build_deal_followup
from agents.ae.crm_sync import sync_deal_to_crm
from agents.ae.tools import (
    generate_proposal,
    calculate_roi,
    get_battlecard,
    predict_deal_blockers,
    calculate_win_probability,
    validate_discount
)

class AEAgentState(BaseAgentState):
    risk_analysis: Optional[Dict[str, Any]]
    win_probability: Optional[Dict[str, Any]]
    proposal_data: Optional[Dict[str, Any]]
    competitor_insights: Optional[Dict[str, Any]]

class AEAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="ae", gemini_model="gemini-1.5-pro")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(AEAgentState)

        # Nodes
        workflow.add_node("analyze_deal", self._analyze_deal)
        workflow.add_node("strategy_planning", self._strategy_planning)
        workflow.add_node("generate_materials", self._generate_materials)
        workflow.add_node("validate_action", self._validate_action)

        # Edges
        workflow.set_entry_point("analyze_deal")
        workflow.add_edge("analyze_deal", "strategy_planning")

        workflow.add_conditional_edges(
            "strategy_planning",
            self._check_strategy,
            {
                "create_content": "generate_materials",
                "negotiation_support": "validate_action" # e.g., discount check
            }
        )

        workflow.add_edge("generate_materials", END)
        workflow.add_edge("validate_action", END)

        return workflow.compile()

    # Helpers
    def _check_strategy(self, state: AEAgentState) -> str:
        context = state.get("context", {})
        intent = context.get("intent", "create_proposal")

        if intent == "approve_discount" or intent == "analyze_competitor":
            return "negotiation_support"
        return "create_content"

    # Nodes
    async def _analyze_deal(self, state: AEAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        deal = {"id": state.get("deal_id") or state.get("context", {}).get("deal_id"), "stage": context.get("stage", "PROSPECTING")}

        risk = await predict_deal_blockers(deal, [])
        prob = await calculate_win_probability(deal, {})

        new_action = {"action": "analyze_deal", "result": "Risk and Prob calculated"}

        return {
            "risk_analysis": risk,
            "win_probability": prob,
            "actions_taken": [new_action]
        }

    async def _strategy_planning(self, state: AEAgentState) -> Dict[str, Any]:
        stage = state.get("context", {}).get("stage", "prospecting").lower()
        followup = build_deal_followup(stage)
        output = state.get("output", {}) or {}
        output["followup"] = followup
        new_action = {"action": "strategy_planning", "details": "Strategy determined by intent"}
        return {"output": output, "actions_taken": [new_action]}

    async def _generate_materials(self, state: AEAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        deal = {"id": state.get("deal_id") or state.get("context", {}).get("deal_id"), "title": context.get("deal_title", "Deal")}

        proposal = await generate_proposal(deal)
        roi = await calculate_roi(context.get("customer_data", {}), {})

        proposal_data = {"proposal": proposal, "roi": roi}

        output = state.get("output", {}) or {}
        output["materials"] = proposal_data

        new_action = {"action": "generate_materials", "result": "Proposal generated"}
        return {
            "proposal_data": proposal_data,
            "output": output,
            "actions_taken": [new_action]
        }

    async def _validate_action(self, state: AEAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        intent = context.get("intent")
        output = state.get("output", {}) or {}
        new_action = {}
        competitor_insights = state.get("competitor_insights")

        if intent == "approve_discount":
            discount = context.get("discount_pct", 0)
            result = await validate_discount(state.get("deal_id") or state.get("context", {}).get("deal_id", ""), discount, "ae-id")
            output["discount_validation"] = result
            new_action = {"action": "validate_discount", "result": result}

        elif intent == "analyze_competitor":
            comp = context.get("competitor", "")
            battlecard = await get_battlecard(comp, {})
            competitor_insights = battlecard
            output["battlecard"] = battlecard
            new_action = {"action": "get_battlecard", "result": "Battlecard fetched"}

        if state.get("deal_id") or state.get("context", {}).get("deal_id"):
            output["crm_sync"] = await sync_deal_to_crm({"dealId": state.get("deal_id") or state.get("context", {}).get("deal_id"), "tenantId": state.get("tenant_id")})

        return {
            "output": output,
            "competitor_insights": competitor_insights,
            "actions_taken": [new_action] if new_action else []
        }
