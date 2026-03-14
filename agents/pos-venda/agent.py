import importlib.util
from pathlib import Path
from typing import Any, Dict, List, Optional

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from agents.shared.base_agent import AgentResult, BaseAgent, BaseAgentState
from agents.shared.tool_runtime import run_tool

_tools_spec = importlib.util.spec_from_file_location("pos_venda_tools", Path(__file__).resolve().parent / "tools.py")
if _tools_spec is None or _tools_spec.loader is None:
    raise ImportError("Não foi possível carregar tools.py do agente pos-venda")
_tools_module = importlib.util.module_from_spec(_tools_spec)
_tools_spec.loader.exec_module(_tools_module)

calculate_health_score = _tools_module.calculate_health_score
predict_churn_risk = _tools_module.predict_churn_risk
analyze_nps_response = _tools_module.analyze_nps_response


class CustomerSuccessModel(BaseModel):
    customer_id: str = Field(default="customer_demo")
    telemetry: Dict[str, Any] = Field(default_factory=dict)
    customer: Dict[str, Any] = Field(default_factory=dict)
    behavior_history: Dict[str, Any] = Field(default_factory=dict)
    nps_response: Dict[str, Any] = Field(default_factory=dict)


class HealthPayload(BaseModel):
    customer_id: str
    telemetry: Dict[str, Any]


class ChurnPayload(BaseModel):
    customer: Dict[str, Any]
    behavior_history: Dict[str, Any]


class NPSPayload(BaseModel):
    response: Dict[str, Any]


class AgentState(BaseAgentState):
    task_plan: Optional[List[Dict[str, Any]]]
    cs_model: Optional[Dict[str, Any]]
    health_result: Optional[Dict[str, Any]]
    churn_result: Optional[Dict[str, Any]]
    nps_result: Optional[Dict[str, Any]]


class PosVendaAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="pos-venda")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(AgentState)
        workflow.add_node("prepare_cs_scope", self._prepare_cs_scope)
        workflow.add_node("run_cs_tasks", self._run_cs_tasks)
        workflow.add_node("publish_cs_output", self._publish_cs_output)
        workflow.set_entry_point("prepare_cs_scope")
        workflow.add_edge("prepare_cs_scope", "run_cs_tasks")
        workflow.add_edge("run_cs_tasks", "publish_cs_output")
        workflow.add_edge("publish_cs_output", END)
        return workflow.compile()

    async def _prepare_cs_scope(self, state: AgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        model = CustomerSuccessModel(
            customer_id=context.get("customer_id", state.get("customer_id") or "customer_demo"),
            telemetry=context.get("telemetry", {"login_frequency": 64}),
            customer=context.get("customer", {"segment": "mid_market"}),
            behavior_history=context.get("behavior_history", {"payment_delays": 1, "login_drop": 5}),
            nps_response=context.get("nps_response", {"score": 8}),
        )
        tasks = [
            {"task": "calculate_health_score", "status": "ready"},
            {"task": "predict_churn_risk", "status": "ready"},
            {"task": "analyze_nps_response", "status": "ready"},
        ]
        return {
            "cs_model": model.model_dump(),
            "task_plan": tasks,
            "actions_taken": [{"action": "prepare_cs_scope", "model": "CustomerSuccessModel", "task_count": 3}],
        }

    async def _run_cs_tasks(self, state: AgentState) -> Dict[str, Any]:
        model = state.get("cs_model", {})
        health = await run_tool(
            tool_name="pos_venda.calculate_health_score",
            handler=calculate_health_score,
            payload={"customer_id": model.get("customer_id", "customer_demo"), "telemetry": model.get("telemetry", {})},
            validation_model=HealthPayload,
            idempotent=True,
        )
        churn = await run_tool(
            tool_name="pos_venda.predict_churn_risk",
            handler=predict_churn_risk,
            payload={"customer": model.get("customer", {}), "behavior_history": model.get("behavior_history", {})},
            validation_model=ChurnPayload,
            idempotent=True,
        )
        nps = await run_tool(
            tool_name="pos_venda.analyze_nps_response",
            handler=analyze_nps_response,
            payload={"response": model.get("nps_response", {})},
            validation_model=NPSPayload,
            idempotent=True,
        )
        statuses = {
            "calculate_health_score": "completed" if health.get("ok") else "failed",
            "predict_churn_risk": "completed" if churn.get("ok") else "failed",
            "analyze_nps_response": "completed" if nps.get("ok") else "failed",
        }
        return {
            "health_result": health,
            "churn_result": churn,
            "nps_result": nps,
            "task_plan": self._update_task_status(state.get("task_plan", []), statuses),
            "actions_taken": [{"action": "run_cs_tasks", "status_by_task": statuses}],
        }

    async def _publish_cs_output(self, state: AgentState) -> Dict[str, Any]:
        deliverables = {
            "health": state.get("health_result", {}),
            "churn": state.get("churn_result", {}),
            "nps": state.get("nps_result", {}),
        }
        output = {
            "agent": "pos-venda",
            "domain": "customer_success",
            "status": self._overall_status(deliverables),
            "tasks": state.get("task_plan", []),
            "models": {"customer_success": state.get("cs_model", {})},
            "deliverables": deliverables,
        }
        return {"data": output, "actions_taken": [{"action": "publish_cs_output", "status": output["status"]}]}

    async def execute(self, task: str, payload: dict) -> AgentResult:
        """Executa uma tarefa de domínio ou roda o pipeline completo do agente."""
        handlers = {
            "avaliar_saude_conta": self._prepare_cs_scope,
            "detectar_risco_churn": self._run_cs_tasks,
            "sugerir_playbook_retencao": self._publish_cs_output,
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
