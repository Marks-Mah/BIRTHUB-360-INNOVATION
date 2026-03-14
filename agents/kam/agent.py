from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.kam.prompts import KAM_AGENT_SYSTEM
from agents.kam.tools import create_account_plan, map_stakeholders, schedule_qbr

class KAMAgentState(BaseAgentState):
    account_plan: Optional[Dict[str, Any]]
    stakeholder_map: Optional[Dict[str, Any]]
    qbr_plan: Optional[Dict[str, Any]]

class KAMAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="kam", gemini_model="gemini-1.5-pro")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(KAMAgentState)

        workflow.add_node("strategize_account", self._strategize_account)
        workflow.add_node("map_org", self._map_org)
        workflow.add_node("plan_qbr", self._plan_qbr)

        workflow.set_entry_point("strategize_account")

        workflow.add_edge("strategize_account", "map_org")
        workflow.add_edge("map_org", "plan_qbr")
        workflow.add_edge("plan_qbr", END)

        return workflow.compile()

    async def _strategize_account(self, state: KAMAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        account_id = context.get("account_id")
        goals = context.get("goals", ["Retention", "Growth"])

        if account_id:
            res = await create_account_plan(account_id, goals)
            return {
                "account_plan": res.get("data"),
                "actions_taken": [{"action": "create_account_plan"}]
            }
        return {}

    async def _map_org(self, state: KAMAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        stakeholders = context.get("stakeholders", [])

        if stakeholders:
            res = await map_stakeholders(stakeholders)
            return {
                "stakeholder_map": res.get("data"),
                "actions_taken": [{"action": "map_stakeholders"}]
            }
        return {}

    async def _plan_qbr(self, state: KAMAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        account_id = context.get("account_id")
        contacts = [s["name"] for s in context.get("stakeholders", [])]

        if account_id:
            res = await schedule_qbr(account_id, contacts)
            return {
                "qbr_plan": res.get("data"),
                "actions_taken": [{"action": "schedule_qbr"}]
            }
        return {}
