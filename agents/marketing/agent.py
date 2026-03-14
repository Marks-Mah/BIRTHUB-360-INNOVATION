from typing import Any, Dict, List, Optional

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from agents.marketing.tools import generate_seo_brief, generate_utm_tags, run_ab_test_analysis
from agents.shared.base_agent import AgentResult, BaseAgent, BaseAgentState
from agents.shared.tool_runtime import run_tool


class CampaignModel(BaseModel):
    topic: str = Field(default="Pipeline B2B")
    competitors: List[str] = Field(default_factory=lambda: ["concorrente_a", "concorrente_b"])
    insights: str = Field(default="Aumentar SQL com CAC eficiente")
    campaign: Dict[str, Any] = Field(default_factory=dict)
    variants: List[str] = Field(default_factory=lambda: ["A", "B"])
    metrics: Dict[str, List[float]] = Field(default_factory=dict)


class SEOBriefPayload(BaseModel):
    topic: str
    competitors: List[str] = Field(default_factory=list)
    sales_call_insights: str = ""


class UTMPayload(BaseModel):
    campaign: Dict[str, Any]


class ABTestPayload(BaseModel):
    test_id: str = Field(min_length=1)
    variants: List[str] = Field(min_length=2)
    metrics: Dict[str, List[float]]


class AgentState(BaseAgentState):
    task_plan: Optional[List[Dict[str, Any]]]
    campaign_model: Optional[Dict[str, Any]]
    seo_brief: Optional[Dict[str, Any]]
    utm_tags: Optional[Dict[str, Any]]
    ab_test: Optional[Dict[str, Any]]


class MarketingAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="marketing")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(AgentState)
        workflow.add_node("prepare_campaign", self._prepare_campaign)
        workflow.add_node("execute_tasks", self._execute_tasks)
        workflow.add_node("publish_domain_output", self._publish_domain_output)
        workflow.set_entry_point("prepare_campaign")
        workflow.add_edge("prepare_campaign", "execute_tasks")
        workflow.add_edge("execute_tasks", "publish_domain_output")
        workflow.add_edge("publish_domain_output", END)
        return workflow.compile()

    async def _prepare_campaign(self, state: AgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        model = CampaignModel(
            topic=context.get("topic", "Pipeline B2B"),
            competitors=context.get("competitors", ["concorrente_a", "concorrente_b"]),
            insights=context.get("sales_call_insights", "Leads pedem prova de ROI rápido"),
            campaign={
                "url": context.get("url", "https://example.com/ebook"),
                "source": context.get("source", "linkedin"),
                "medium": context.get("medium", "paid-social"),
                "name": context.get("campaign_name", "growth_sprint"),
            },
            variants=context.get("variants", ["A", "B"]),
            metrics=context.get("metrics", {"A": [0.09, 0.1, 0.12], "B": [0.07, 0.08, 0.09]}),
        )
        task_plan = [
            {"task": "seo_brief", "owner": "marketing", "status": "ready"},
            {"task": "utm_tags", "owner": "marketing_ops", "status": "ready"},
            {"task": "ab_test_analysis", "owner": "growth", "status": "ready"},
        ]
        return {
            "campaign_model": model.model_dump(),
            "task_plan": task_plan,
            "actions_taken": [{"action": "prepare_campaign", "model": "CampaignModel", "task_count": 3}],
        }

    async def _execute_tasks(self, state: AgentState) -> Dict[str, Any]:
        model = state.get("campaign_model", {})
        seo = await run_tool(
            tool_name="marketing.generate_seo_brief",
            handler=generate_seo_brief,
            payload={
                "topic": model.get("topic"),
                "competitors": model.get("competitors", []),
                "sales_call_insights": model.get("insights", ""),
            },
            validation_model=SEOBriefPayload,
            idempotent=True,
        )
        utm = await run_tool(
            tool_name="marketing.generate_utm_tags",
            handler=generate_utm_tags,
            payload={"campaign": model.get("campaign", {})},
            validation_model=UTMPayload,
            idempotent=True,
        )
        ab_test = await run_tool(
            tool_name="marketing.run_ab_test_analysis",
            handler=run_ab_test_analysis,
            payload={
                "test_id": "mk-ab-001",
                "variants": model.get("variants", ["A", "B"]),
                "metrics": model.get("metrics", {}),
            },
            validation_model=ABTestPayload,
            idempotent=True,
        )

        deliverables = {"seo_brief": seo, "utm_tags": utm, "ab_test": ab_test}
        statuses = {
            "seo_brief": "completed" if seo.get("ok") else "failed",
            "utm_tags": "completed" if utm.get("ok") else "failed",
            "ab_test_analysis": "completed" if ab_test.get("ok") else "failed",
        }
        return {
            "seo_brief": seo,
            "utm_tags": utm,
            "ab_test": ab_test,
            "task_plan": self._update_task_status(state.get("task_plan", []), statuses),
            "actions_taken": [{"action": "execute_tasks", "status_by_task": statuses}],
        }

    async def _publish_domain_output(self, state: AgentState) -> Dict[str, Any]:
        deliverables = {
            "seo_brief": state.get("seo_brief", {}),
            "utm_tags": state.get("utm_tags", {}),
            "ab_test": state.get("ab_test", {}),
        }
        output = {
            "agent": "marketing",
            "domain": "growth_marketing",
            "status": self._overall_status(deliverables),
            "tasks": state.get("task_plan", []),
            "models": {"campaign": state.get("campaign_model", {})},
            "deliverables": deliverables,
        }
        return {"data": output, "actions_taken": [{"action": "publish_domain_output", "status": output["status"]}]}

    async def execute(self, task: str, payload: dict) -> AgentResult:
        """Executa uma tarefa de domínio ou roda o pipeline completo do agente."""
        handlers = {
            "gerar_campanha": self._prepare_campaign,
            "analisar_performance": self._execute_tasks,
            "sugerir_teste_ab": self._execute_tasks,
        }
        if task in handlers:
            state = {"tenant_id": str(payload.get("tenant_id", "unknown")), "context": payload, "messages": [], "actions_taken": [], "data": None, "error": None}
            started = __import__("time").perf_counter()
            result = await handlers[task](state)
            return AgentResult(agent_id=self.name, task=task, status="success", data=result.get("data", result), error=None, duration_ms=(__import__("time").perf_counter()-started)*1000, timestamp=__import__("datetime").datetime.now(__import__("datetime").timezone.utc))
        return await self.run({"task": task, "context": payload, "tenantId": payload.get("tenant_id", "unknown")})

    @staticmethod
    def _update_task_status(tasks: List[Dict[str, Any]], statuses: Dict[str, str]) -> List[Dict[str, Any]]:
        mapped: List[Dict[str, Any]] = []
        for item in tasks:
            name = item.get("task")
            mapped.append({**item, "status": statuses.get(name, item.get("status", "ready"))})
        return mapped

    @staticmethod
    def _overall_status(deliverables: Dict[str, Dict[str, Any]]) -> str:
        if all(item.get("ok") for item in deliverables.values()):
            return "completed"
        if any(item.get("ok") for item in deliverables.values()):
            return "partial"
        return "failed"
