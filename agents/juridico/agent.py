from typing import Any, Dict, List, Optional

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from agents.juridico.tools import classify_legal_risk, monitor_contract_deadlines, validate_msa_terms
from agents.shared.base_agent import AgentResult, BaseAgent, BaseAgentState
from agents.shared.tool_runtime import run_tool


class LegalModel(BaseModel):
    case_data: Dict[str, Any] = Field(default_factory=dict)
    msa: Dict[str, Any] = Field(default_factory=dict)
    policy: Dict[str, Any] = Field(default_factory=dict)


class LegalRiskPayload(BaseModel):
    case_data: Dict[str, Any]


class MsaValidationPayload(BaseModel):
    msa: Dict[str, Any]
    policy: Dict[str, Any]


class AgentState(BaseAgentState):
    task_plan: Optional[List[Dict[str, Any]]]
    legal_model: Optional[Dict[str, Any]]
    legal_risk_result: Optional[Dict[str, Any]]
    deadlines_result: Optional[Dict[str, Any]]
    msa_validation_result: Optional[Dict[str, Any]]


class JuridicoAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="juridico")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(AgentState)
        workflow.add_node("prepare_legal_scope", self._prepare_legal_scope)
        workflow.add_node("run_legal_tasks", self._run_legal_tasks)
        workflow.add_node("publish_legal_output", self._publish_legal_output)
        workflow.set_entry_point("prepare_legal_scope")
        workflow.add_edge("prepare_legal_scope", "run_legal_tasks")
        workflow.add_edge("run_legal_tasks", "publish_legal_output")
        workflow.add_edge("publish_legal_output", END)
        return workflow.compile()

    async def _prepare_legal_scope(self, state: AgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        model = LegalModel(
            case_data=context.get("case_data", {"impact": 3, "probability": 3}),
            msa=context.get("msa", {"liability_cap_months": 6, "governing_law": "US"}),
            policy=context.get("policy", {"min_liability_cap_months": 12, "approved_laws": ["BR", "PT"]}),
        )
        tasks = [
            {"task": "classify_legal_risk", "status": "ready"},
            {"task": "monitor_contract_deadlines", "status": "ready"},
            {"task": "validate_msa_terms", "status": "ready"},
        ]
        return {
            "legal_model": model.model_dump(),
            "task_plan": tasks,
            "actions_taken": [{"action": "prepare_legal_scope", "model": "LegalModel", "task_count": 3}],
        }

    async def _run_legal_tasks(self, state: AgentState) -> Dict[str, Any]:
        model = state.get("legal_model", {})
        risk = await run_tool(
            tool_name="juridico.classify_legal_risk",
            handler=classify_legal_risk,
            payload={"case_data": model.get("case_data", {})},
            validation_model=LegalRiskPayload,
            idempotent=True,
        )
        deadlines = await run_tool(
            tool_name="juridico.monitor_contract_deadlines",
            handler=monitor_contract_deadlines,
            payload={},
            idempotent=True,
        )
        msa_validation = await run_tool(
            tool_name="juridico.validate_msa_terms",
            handler=validate_msa_terms,
            payload={"msa": model.get("msa", {}), "policy": model.get("policy", {})},
            validation_model=MsaValidationPayload,
            idempotent=True,
        )
        statuses = {
            "classify_legal_risk": "completed" if risk.get("ok") else "failed",
            "monitor_contract_deadlines": "completed" if deadlines.get("ok") else "failed",
            "validate_msa_terms": "completed" if msa_validation.get("ok") else "failed",
        }
        return {
            "legal_risk_result": risk,
            "deadlines_result": deadlines,
            "msa_validation_result": msa_validation,
            "task_plan": self._update_task_status(state.get("task_plan", []), statuses),
            "actions_taken": [{"action": "run_legal_tasks", "status_by_task": statuses}],
        }

    async def _publish_legal_output(self, state: AgentState) -> Dict[str, Any]:
        deliverables = {
            "risk": state.get("legal_risk_result", {}),
            "deadlines": state.get("deadlines_result", {}),
            "msa_validation": state.get("msa_validation_result", {}),
        }
        output = {
            "agent": "juridico",
            "domain": "legal_ops",
            "status": self._overall_status(deliverables),
            "tasks": state.get("task_plan", []),
            "models": {"legal": state.get("legal_model", {})},
            "deliverables": deliverables,
        }
        return {"data": output, "actions_taken": [{"action": "publish_legal_output", "status": output["status"]}]}

    async def execute(self, task: str, payload: dict) -> AgentResult:
        """Executa uma tarefa de domínio ou roda o pipeline completo do agente."""
        handlers = {
            "analisar_riscos_contrato": self._prepare_legal_scope,
            "validar_clausulas_msa": self._run_legal_tasks,
            "gerar_parecer_juridico": self._publish_legal_output,
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
