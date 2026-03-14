from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.pre_sales.prompts import PRE_SALES_AGENT_SYSTEM
from agents.pre_sales.tools import generate_demo_credentials, answer_rfp_question, check_technical_feasibility

class PreSalesAgentState(BaseAgentState):
    demo_env: Optional[Dict[str, Any]]
    rfp_response: Optional[Dict[str, Any]]
    feasibility_report: Optional[Dict[str, Any]]

class PreSalesAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="pre_sales", gemini_model="gemini-1.5-pro")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(PreSalesAgentState)

        workflow.add_node("process_technical_req", self._process_technical_req)
        workflow.set_entry_point("process_technical_req")
        workflow.add_edge("process_technical_req", END)

        return workflow.compile()

    async def _process_technical_req(self, state: PreSalesAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        action = context.get("action")

        updates = {}

        if action == "generate_demo":
            company = context.get("company", "Prospect")
            days = context.get("duration", 14)
            res = await generate_demo_credentials(company, days)
            updates["demo_env"] = res.get("data")

        elif action == "answer_rfp":
            question = context.get("question")
            if question:
                res = await answer_rfp_question(question)
                updates["rfp_response"] = res.get("data")

        elif action == "check_feasibility":
            req = context.get("requirement")
            if req:
                res = await check_technical_feasibility(req)
                updates["feasibility_report"] = res.get("data")

        updates["actions_taken"] = [{"action": action, "status": "completed"}]
        return updates
