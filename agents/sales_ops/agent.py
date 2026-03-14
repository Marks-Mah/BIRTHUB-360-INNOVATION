from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.sales_ops.prompts import SALES_OPS_AGENT_SYSTEM
from agents.sales_ops.tools import clean_crm_data, forecast_revenue, assign_leads

class SalesOpsAgentState(BaseAgentState):
    cleaning_report: Optional[Dict[str, Any]]
    forecast_report: Optional[Dict[str, Any]]
    assignment_report: Optional[Dict[str, Any]]

class SalesOpsAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="sales_ops", gemini_model="gemini-1.5-flash") # Analytical tasks

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(SalesOpsAgentState)

        workflow.add_node("process_request", self._process_request)
        workflow.set_entry_point("process_request")
        workflow.add_edge("process_request", END)

        return workflow.compile()

    async def _process_request(self, state: SalesOpsAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        action = context.get("action")

        updates = {}

        if action == "clean_data":
            lead_id = context.get("lead_id")
            if lead_id:
                res = await clean_crm_data(lead_id)
                updates["cleaning_report"] = res.get("data")

        elif action == "forecast":
            pipeline = context.get("pipeline", [])
            res = await forecast_revenue(pipeline)
            updates["forecast_report"] = res.get("data")

        elif action == "assign_leads":
            leads = context.get("leads", [])
            rules = context.get("rules", {})
            res = await assign_leads(leads, rules)
            updates["assignment_report"] = res.get("data")

        updates["actions_taken"] = [{"action": action, "status": "completed"}]
        return updates
