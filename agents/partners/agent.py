from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.partners.prompts import PARTNERS_AGENT_SYSTEM
from agents.partners.tools import register_partner_lead, calculate_partner_commission, share_collateral

class PartnersAgentState(BaseAgentState):
    registration_status: Optional[Dict[str, Any]]
    commission_calc: Optional[Dict[str, Any]]
    collateral_sent: Optional[Dict[str, Any]]

class PartnersAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="partners", gemini_model="gemini-1.5-flash")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(PartnersAgentState)

        workflow.add_node("process_partner_request", self._process_partner_request)
        workflow.set_entry_point("process_partner_request")
        workflow.add_edge("process_partner_request", END)

        return workflow.compile()

    async def _process_partner_request(self, state: PartnersAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        action = context.get("action")

        updates = {}

        if action == "register_lead":
            pid = context.get("partner_id")
            details = context.get("lead_details", {})
            if pid:
                res = await register_partner_lead(pid, details)
                updates["registration_status"] = res.get("data")

        elif action == "calculate_commission":
            val = context.get("value", 0)
            tier = context.get("tier", "Silver")
            res = await calculate_partner_commission(val, tier)
            updates["commission_calc"] = res.get("data")

        elif action == "share_collateral":
            email = context.get("email")
            rtype = context.get("type", "general")
            if email:
                res = await share_collateral(email, rtype)
                updates["collateral_sent"] = res.get("data")

        updates["actions_taken"] = [{"action": action, "status": "completed"}]
        return updates
