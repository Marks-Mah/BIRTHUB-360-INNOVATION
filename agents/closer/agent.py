from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.closer.prompts import CLOSER_AGENT_SYSTEM
from agents.closer.tools import analyze_objections, calculate_discount_approval, generate_contract_draft

class CloserAgentState(BaseAgentState):
    objection_analysis: Optional[Dict[str, Any]]
    discount_status: Optional[Dict[str, Any]]
    contract_draft: Optional[Dict[str, Any]]

class CloserAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="closer", gemini_model="gemini-1.5-pro")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(CloserAgentState)

        workflow.add_node("analyze_objections", self._analyze_objections)
        workflow.add_node("handle_negotiation", self._handle_negotiation)
        workflow.add_node("draft_contract", self._draft_contract)

        workflow.set_entry_point("analyze_objections")

        workflow.add_edge("analyze_objections", "handle_negotiation")
        workflow.add_conditional_edges(
            "handle_negotiation",
            self._check_negotiation_result,
            {
                "approved": "draft_contract",
                "rejected": END # Stop if discount rejected
            }
        )
        workflow.add_edge("draft_contract", END)

        return workflow.compile()

    def _check_negotiation_result(self, state: CloserAgentState) -> str:
        status = state.get("discount_status", {})
        if status.get("approved", True): # Default to true if no discount requested
            return "approved"
        return "rejected"

    async def _analyze_objections(self, state: CloserAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        history = context.get("history", [])

        result = await analyze_objections(history)
        data = result.get("data", {}) if result.get("ok") else {}

        return {
            "objection_analysis": data,
            "actions_taken": [{"action": "analyze_objections", "strategy": data.get("strategy")}]
        }

    async def _handle_negotiation(self, state: CloserAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        deal_value = context.get("value", 0)
        requested_discount = context.get("requested_discount", 0.0)

        if requested_discount > 0:
            result = await calculate_discount_approval(deal_value, requested_discount)
            data = result.get("data", {}) if result.get("ok") else {}
            return {
                "discount_status": data,
                "actions_taken": [{"action": "negotiate", "approved": data.get("approved")}]
            }

        return {
            "discount_status": {"approved": True},
            "actions_taken": [{"action": "negotiate", "details": "No discount requested"}]
        }

    async def _draft_contract(self, state: CloserAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        # Merge negotiated terms
        discount_status = state.get("discount_status", {})
        if discount_status.get("approved") and discount_status.get("requested", 0) > 0:
            context["applied_discount"] = discount_status.get("requested")

        result = await generate_contract_draft(context)
        data = result.get("data", {}) if result.get("ok") else {}

        return {
            "contract_draft": data,
            "actions_taken": [{"action": "draft_contract", "url": data.get("contract_url")}]
        }
