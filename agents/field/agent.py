from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.field.prompts import FIELD_AGENT_SYSTEM
from agents.field.tools import optimize_route, log_visit_report, check_inventory_nearby

class FieldAgentState(BaseAgentState):
    route_plan: Optional[Dict[str, Any]]
    visit_report: Optional[Dict[str, Any]]
    inventory_check: Optional[Dict[str, Any]]

class FieldAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="field", gemini_model="gemini-1.5-flash") # Mobile/Speed priority

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(FieldAgentState)

        workflow.add_node("manage_field_tasks", self._manage_field_tasks)
        workflow.set_entry_point("manage_field_tasks")
        workflow.add_edge("manage_field_tasks", END)

        return workflow.compile()

    async def _manage_field_tasks(self, state: FieldAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        action = context.get("action")

        updates = {}

        if action == "optimize_route":
            start = context.get("start_location", "Office")
            visits = context.get("visits", [])
            res = await optimize_route(start, visits)
            updates["route_plan"] = res.get("data")

        elif action == "log_visit":
            vid = context.get("visit_id")
            notes = context.get("notes", "")
            outcome = context.get("outcome", "visited")
            if vid:
                res = await log_visit_report(vid, notes, outcome)
                updates["visit_report"] = res.get("data")

        elif action == "check_stock":
            loc = context.get("location")
            sku = context.get("sku")
            if loc and sku:
                res = await check_inventory_nearby(loc, sku)
                updates["inventory_check"] = res.get("data")

        updates["actions_taken"] = [{"action": action, "status": "completed"}]
        return updates
