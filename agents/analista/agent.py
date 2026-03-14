from typing import Any, Dict, List, Optional

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from agents.analista.tools import analyze_funnel, create_kpi_scorecard, detect_anomaly
from agents.shared.base_agent import AgentResult, BaseAgent, BaseAgentState
from agents.shared.tool_runtime import run_tool


class AnalyticsModel(BaseModel):
    funnel: Dict[str, Any] = Field(default_factory=dict)
    anomaly: Dict[str, Any] = Field(default_factory=dict)
    metrics: Dict[str, float] = Field(default_factory=dict)
    targets: Dict[str, float] = Field(default_factory=dict)


class FunnelPayload(BaseModel):
    stage_from: int | float
    stage_to: int | float
    period: str


class AnomalyPayload(BaseModel):
    metric: str
    current_value: float
    historical: List[float]


class ScorecardPayload(BaseModel):
    metrics: Dict[str, float]
    targets: Dict[str, float]


class AgentState(BaseAgentState):
    task_plan: Optional[List[Dict[str, Any]]]
    analytics_model: Optional[Dict[str, Any]]
    funnel_result: Optional[Dict[str, Any]]
    anomaly_result: Optional[Dict[str, Any]]
    scorecard_result: Optional[Dict[str, Any]]


class AnalistaAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="analista")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(AgentState)
        workflow.add_node("prepare_analytics_scope", self._prepare_analytics_scope)
        workflow.add_node("run_analytics_tasks", self._run_analytics_tasks)
        workflow.add_node("publish_analysis", self._publish_analysis)
        workflow.set_entry_point("prepare_analytics_scope")
        workflow.add_edge("prepare_analytics_scope", "run_analytics_tasks")
        workflow.add_edge("run_analytics_tasks", "publish_analysis")
        workflow.add_edge("publish_analysis", END)
        return workflow.compile()

    async def _prepare_analytics_scope(self, state: AgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        model = AnalyticsModel(
            funnel={
                "stage_from": context.get("stage_from", 120),
                "stage_to": context.get("stage_to", 42),
                "period": context.get("period", "last_30_days"),
            },
            anomaly={
                "metric": context.get("metric", "mrr_growth_rate"),
                "current_value": context.get("current_value", 85.0),
                "historical": context.get("historical", [100.0, 98.0, 102.0, 97.5]),
            },
            metrics=context.get("metrics", {"mrr_growth": 8.5, "conversion_rate": 0.34}),
            targets=context.get("targets", {"mrr_growth": 10.0, "conversion_rate": 0.4}),
        )
        tasks = [
            {"task": "analyze_funnel", "status": "ready"},
            {"task": "detect_anomaly", "status": "ready"},
            {"task": "create_kpi_scorecard", "status": "ready"},
        ]
        return {
            "analytics_model": model.model_dump(),
            "task_plan": tasks,
            "actions_taken": [{"action": "prepare_analytics_scope", "model": "AnalyticsModel", "task_count": 3}],
        }

    async def _run_analytics_tasks(self, state: AgentState) -> Dict[str, Any]:
        model = state.get("analytics_model", {})
        funnel = model.get("funnel", {})
        anomaly = model.get("anomaly", {})

        funnel_result = await run_tool(
            tool_name="analista.analyze_funnel",
            handler=analyze_funnel,
            payload={"stage_from": funnel.get("stage_from", 0), "stage_to": funnel.get("stage_to", 0), "period": funnel.get("period", "")},
            validation_model=FunnelPayload,
            idempotent=True,
        )
        anomaly_result = await run_tool(
            tool_name="analista.detect_anomaly",
            handler=detect_anomaly,
            payload={
                "metric": anomaly.get("metric", "metric"),
                "current_value": anomaly.get("current_value", 0),
                "historical": anomaly.get("historical", []),
            },
            validation_model=AnomalyPayload,
            idempotent=True,
        )
        scorecard = await run_tool(
            tool_name="analista.create_kpi_scorecard",
            handler=create_kpi_scorecard,
            payload={"metrics": model.get("metrics", {}), "targets": model.get("targets", {})},
            validation_model=ScorecardPayload,
            idempotent=True,
        )
        statuses = {
            "analyze_funnel": "completed" if funnel_result.get("ok") else "failed",
            "detect_anomaly": "completed" if anomaly_result.get("ok") else "failed",
            "create_kpi_scorecard": "completed" if scorecard.get("ok") else "failed",
        }
        return {
            "funnel_result": funnel_result,
            "anomaly_result": anomaly_result,
            "scorecard_result": scorecard,
            "task_plan": self._update_task_status(state.get("task_plan", []), statuses),
            "actions_taken": [{"action": "run_analytics_tasks", "status_by_task": statuses}],
        }

    async def _publish_analysis(self, state: AgentState) -> Dict[str, Any]:
        deliverables = {
            "funnel": state.get("funnel_result", {}),
            "anomaly": state.get("anomaly_result", {}),
            "scorecard": state.get("scorecard_result", {}),
        }
        output = {
            "agent": "analista",
            "domain": "revenue_analytics",
            "status": self._overall_status(deliverables),
            "tasks": state.get("task_plan", []),
            "models": {"analytics": state.get("analytics_model", {})},
            "deliverables": deliverables,
        }
        return {"data": output, "actions_taken": [{"action": "publish_analysis", "status": output["status"]}]}

    async def execute(self, task: str, payload: dict) -> AgentResult:
        """Executa uma tarefa de domínio ou roda o pipeline completo do agente."""
        handlers = {
            "consolidar_dados": self._prepare_analysis_scope,
            "calcular_insights": self._run_analysis_tasks,
            "gerar_recomendacoes": self._publish_analysis,
        }
        if task in handlers:
            state = {"tenant_id": str(payload.get("tenant_id", "unknown")), "context": payload, "messages": [], "actions_taken": [], "data": None, "error": None}
            started = __import__("time").perf_counter()
            result = await handlers[task](state)
            return AgentResult(agent_id=self.name, task=task, status="success", data=result.get("data", result), error=None, duration_ms=(__import__("time").perf_counter()-started)*1000, timestamp=__import__("datetime").datetime.now(__import__("datetime").timezone.utc))
        return await self.run({"task": task, "context": payload, "tenantId": payload.get("tenant_id", "unknown")})

    @staticmethod
    def _update_task_status(tasks: List[Dict[str, Any]], statuses: Dict[str, str]) -> List[Dict[str, Any]]:
        return [{**item, "status": statuses.get(item.get("task"), item.get("status", "ready"))} for item in tasks]

    @staticmethod
    def _overall_status(deliverables: Dict[str, Dict[str, Any]]) -> str:
        if all(item.get("ok") for item in deliverables.values()):
            return "completed"
        if any(item.get("ok") for item in deliverables.values()):
            return "partial"
        return "failed"
