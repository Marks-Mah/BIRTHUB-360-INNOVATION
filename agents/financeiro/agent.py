from typing import Any, Dict, List, Optional

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from agents.financeiro.tools import detect_duplicate_payments, forecast_cashflow, score_credit_risk
from agents.shared.base_agent import AgentResult, BaseAgent, BaseAgentState
from agents.shared.tool_runtime import run_tool


class FinancialModel(BaseModel):
    months_ahead: int = Field(default=6, ge=1)
    customer: Dict[str, Any] = Field(default_factory=dict)
    transactions: List[Dict[str, Any]] = Field(default_factory=list)


class CashflowPayload(BaseModel):
    months_ahead: int = Field(ge=1)


class CreditRiskPayload(BaseModel):
    customer: Dict[str, Any]


class DuplicatePaymentsPayload(BaseModel):
    transactions: List[Dict[str, Any]]


class AgentState(BaseAgentState):
    task_plan: Optional[List[Dict[str, Any]]]
    finance_model: Optional[Dict[str, Any]]
    cashflow_result: Optional[Dict[str, Any]]
    credit_risk_result: Optional[Dict[str, Any]]
    duplicate_payments_result: Optional[Dict[str, Any]]


class FinanceiroAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="financeiro")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(AgentState)
        workflow.add_node("prepare_finance_scope", self._prepare_finance_scope)
        workflow.add_node("run_finance_tasks", self._run_finance_tasks)
        workflow.add_node("publish_financial_decision", self._publish_financial_decision)
        workflow.set_entry_point("prepare_finance_scope")
        workflow.add_edge("prepare_finance_scope", "run_finance_tasks")
        workflow.add_edge("run_finance_tasks", "publish_financial_decision")
        workflow.add_edge("publish_financial_decision", END)
        return workflow.compile()

    async def _prepare_finance_scope(self, state: AgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        model = FinancialModel(
            months_ahead=context.get("months_ahead", 6),
            customer=context.get("customer", {"late_payments": 1, "dispute_open": False}),
            transactions=context.get(
                "transactions",
                [
                    {"vendor": "Cloud", "amount": 3500.0, "invoice_number": "INV-1"},
                    {"vendor": "Cloud", "amount": 3500.0, "invoice_number": "INV-1"},
                ],
            ),
        )
        tasks = [
            {"task": "forecast_cashflow", "status": "ready"},
            {"task": "score_credit_risk", "status": "ready"},
            {"task": "detect_duplicate_payments", "status": "ready"},
        ]
        return {
            "finance_model": model.model_dump(),
            "task_plan": tasks,
            "actions_taken": [{"action": "prepare_finance_scope", "model": "FinancialModel", "task_count": 3}],
        }

    async def _run_finance_tasks(self, state: AgentState) -> Dict[str, Any]:
        model = state.get("finance_model", {})
        cashflow = await run_tool(
            tool_name="financeiro.forecast_cashflow",
            handler=forecast_cashflow,
            payload={"months_ahead": model.get("months_ahead", 6)},
            validation_model=CashflowPayload,
            idempotent=True,
        )
        credit = await run_tool(
            tool_name="financeiro.score_credit_risk",
            handler=score_credit_risk,
            payload={"customer": model.get("customer", {})},
            validation_model=CreditRiskPayload,
            idempotent=True,
        )
        duplicates = await run_tool(
            tool_name="financeiro.detect_duplicate_payments",
            handler=detect_duplicate_payments,
            payload={"transactions": model.get("transactions", [])},
            validation_model=DuplicatePaymentsPayload,
            idempotent=True,
        )
        statuses = {
            "forecast_cashflow": "completed" if cashflow.get("ok") else "failed",
            "score_credit_risk": "completed" if credit.get("ok") else "failed",
            "detect_duplicate_payments": "completed" if duplicates.get("ok") else "failed",
        }
        return {
            "cashflow_result": cashflow,
            "credit_risk_result": credit,
            "duplicate_payments_result": duplicates,
            "task_plan": self._update_task_status(state.get("task_plan", []), statuses),
            "actions_taken": [{"action": "run_finance_tasks", "status_by_task": statuses}],
        }

    async def _publish_financial_decision(self, state: AgentState) -> Dict[str, Any]:
        deliverables = {
            "cashflow": state.get("cashflow_result", {}),
            "credit_risk": state.get("credit_risk_result", {}),
            "duplicate_payments": state.get("duplicate_payments_result", {}),
        }
        output = {
            "agent": "financeiro",
            "domain": "finance_ops",
            "status": self._overall_status(deliverables),
            "tasks": state.get("task_plan", []),
            "models": {"financial": state.get("finance_model", {})},
            "deliverables": deliverables,
        }
        return {"data": output, "actions_taken": [{"action": "publish_financial_decision", "status": output["status"]}]}

    async def execute(self, task: str, payload: dict) -> AgentResult:
        """Executa uma tarefa de domínio ou roda o pipeline completo do agente."""
        handlers = {
            "prever_fluxo_caixa": self._prepare_finance_scope,
            "avaliar_risco_credito": self._run_finance_tasks,
            "detectar_pagamentos_duplicados": self._run_finance_tasks,
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
