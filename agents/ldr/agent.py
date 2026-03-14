from typing import Dict, Any, TypedDict, Annotated, List
import operator
import asyncio


from agents.shared.base_agent import BaseAgent, BaseAgentState
from langgraph.graph import StateGraph, END

from agents.ldr.tools import (
    enrich_technographic,
    map_org_chart,
    score_icp,
    detect_intent_signals,
    validate_email_smtp,
    check_financial_health,
    deduplicate_and_merge
)
from agents.ldr.prompts import LDR_AGENT_SYSTEM

ICP_WEIGHTS = {
    "revenue_range": 0.25,
    "employee_count": 0.15,
    "tech_maturity": 0.20,
    "industry_fit": 0.20,
    "location": 0.05,
    "intent_signals": 0.15,
}

class LDRAgentState(BaseAgentState):
    icp_score: int
    icp_tier: str | None
    intent_score: int
    alert_sent: bool


class LDRAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="LDR_Agent")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(LDRAgentState)

        # Define nodes
        workflow.add_node("enrich_data", self.enrich_data_node)
        workflow.add_node("score_lead", self.score_lead_node)
        workflow.add_node("validate_email", self.validate_email_node)

        # Define edges
        workflow.set_entry_point("enrich_data")
        workflow.add_edge("enrich_data", "validate_email")
        workflow.add_edge("validate_email", "score_lead")
        workflow.add_edge("score_lead", END)

        return workflow.compile()

    async def enrich_data_node(self, state: LDRAgentState) -> Dict[str, Any]:
        """Node for gathering data about the lead"""
        context = state.get("context", {})
        company_domain = context.get("company_domain")

        tech_stack = {}
        intent = {}
        financial = {}

        if company_domain:
            tech_stack = await enrich_technographic(company_domain)
            intent = await detect_intent_signals(company_domain)
            # Simulate financial lookup
            financial = await check_financial_health("00.000.000/0001-00", context.get("company_name", ""))

        return {
            "context": {
                **context,
                "tech_stack": tech_stack,
                "intent_signals": intent,
                "financial_data": financial
            },
            "actions_taken": ["enrich_technographic", "detect_intent_signals", "check_financial_health"]
        }

    async def validate_email_node(self, state: LDRAgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        email = context.get("email")

        validation = {}
        if email:
            validation = await validate_email_smtp(email)

        return {
            "context": {
                **context,
                "email_validation": validation
            },
            "actions_taken": ["validate_email_smtp"]
        }

    async def score_lead_node(self, state: LDRAgentState) -> Dict[str, Any]:
        context = state.get("context", {})

        # Combine all gathered data for scoring
        lead_data = context

        score_result = await score_icp(lead_data, ICP_WEIGHTS)

        return {
            "output": {**score_result, "enrichment": {"tech_stack": context.get("tech_stack", {})}},
            "icp_score": score_result.get("score"),
            "icp_tier": score_result.get("tier"),
            "actions_taken": ["score_icp"]
        }
