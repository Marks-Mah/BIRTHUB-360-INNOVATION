from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.bdr.prompts import BDR_AGENT_SYSTEM
from agents.bdr.tools import find_leads, verify_email, generate_outreach_sequence

class BDRAgentState(BaseAgentState):
    leads: Optional[List[Dict[str, Any]]]
    verification_results: Optional[List[Dict[str, Any]]]
    outreach_plan: Optional[Dict[str, Any]]

class BDRAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="bdr", gemini_model="gemini-1.5-flash") # Use flash for speed/cost in prospecting

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(BDRAgentState)

        workflow.add_node("find_prospects", self._find_prospects)
        workflow.add_node("verify_emails", self._verify_emails)
        workflow.add_node("plan_outreach", self._plan_outreach)

        workflow.set_entry_point("find_prospects")

        workflow.add_edge("find_prospects", "verify_emails")
        workflow.add_edge("verify_emails", "plan_outreach")
        workflow.add_edge("plan_outreach", END)

        return workflow.compile()

    async def _find_prospects(self, state: BDRAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        criteria = context.get("criteria", {})

        result = await find_leads(criteria)
        leads = result.get("data", []) if result.get("ok") else []

        return {
            "leads": leads,
            "actions_taken": [{"action": "find_prospects", "count": len(leads)}]
        }

    async def _verify_emails(self, state: BDRAgentState) -> Dict[str, Any]:
        leads = state.get("leads", [])
        results = []
        valid_leads = []

        for lead in leads:
            res = await verify_email(lead.get("email", ""))
            data = res.get("data", {})
            if data.get("valid"):
                valid_leads.append(lead)
            results.append(data)

        return {
            "leads": valid_leads, # Filter down to only valid ones
            "verification_results": results,
            "actions_taken": [{"action": "verify_emails", "valid_count": len(valid_leads)}]
        }

    async def _plan_outreach(self, state: BDRAgentState) -> Dict[str, Any]:
        leads = state.get("leads", [])
        outreach_plans = {}

        for lead in leads:
            res = await generate_outreach_sequence(lead)
            if res.get("ok"):
                outreach_plans[lead.get("email")] = res.get("data")

        return {
            "outreach_plan": outreach_plans,
            "actions_taken": [{"action": "plan_outreach", "generated_count": len(outreach_plans)}]
        }
