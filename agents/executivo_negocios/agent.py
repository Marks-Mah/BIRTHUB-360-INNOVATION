from typing import Any, Dict, List, Optional

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.shared.tool_runtime import run_tool
from agents.executivo_negocios.tools import map_new_market_opportunities, score_outbound_targets, build_entry_strategy, estimate_business_case


class PipelineModel(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class ToolPayload(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict)


class AgentState(BaseAgentState):
    task_plan: Optional[List[Dict[str, Any]]]
    role_model: Optional[Dict[str, Any]]
    t1_result: Optional[Dict[str, Any]]
    t2_result: Optional[Dict[str, Any]]
    t3_result: Optional[Dict[str, Any]]
    t4_result: Optional[Dict[str, Any]]


class ExecutivoNegociosAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="executivo-negocios")

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(AgentState)
        workflow.add_node("prepare", self._prepare)
        workflow.add_node("run_tasks", self._run_tasks)
        workflow.add_node("publish", self._publish)
        workflow.set_entry_point("prepare")
        workflow.add_edge("prepare", "run_tasks")
        workflow.add_edge("run_tasks", "publish")
        workflow.add_edge("publish", END)
        return workflow.compile()

    async def _prepare(self, state: AgentState) -> Dict[str, Any]:
        context = state.get("context", {})
        model = PipelineModel(context=context)
        tasks = [
            {"task": "map_new_market_opportunities", "status": "ready"},
            {"task": "score_outbound_targets", "status": "ready"},
            {"task": "build_entry_strategy", "status": "ready"},
            {"task": "estimate_business_case", "status": "ready"},
        ]
        return {
            "role_model": model.model_dump(),
            "task_plan": tasks,
            "actions_taken": [{"action": "prepare", "role": "executivo_negocios", "task_count": 4}],
        }

    async def _run_tasks(self, state: AgentState) -> Dict[str, Any]:
        model = state.get("role_model", {})
        context = model.get("context", {})

        t1 = await run_tool(tool_name="executivo-negocios.map_new_market_opportunities", handler=map_new_market_opportunities, payload={"context": context}, validation_model=ToolPayload, idempotent=True)
        t2 = await run_tool(tool_name="executivo-negocios.score_outbound_targets", handler=score_outbound_targets, payload={"context": context}, validation_model=ToolPayload, idempotent=True)
        t3 = await run_tool(tool_name="executivo-negocios.build_entry_strategy", handler=build_entry_strategy, payload={"context": context}, validation_model=ToolPayload, idempotent=True)
        t4 = await run_tool(tool_name="executivo-negocios.estimate_business_case", handler=estimate_business_case, payload={"context": context}, validation_model=ToolPayload, idempotent=True)

        statuses = {
            "map_new_market_opportunities": "completed" if t1.get("ok") else "failed",
            "score_outbound_targets": "completed" if t2.get("ok") else "failed",
            "build_entry_strategy": "completed" if t3.get("ok") else "failed",
            "estimate_business_case": "completed" if t4.get("ok") else "failed",
        }

        return {
            "t1_result": t1,
            "t2_result": t2,
            "t3_result": t3,
            "t4_result": t4,
            "task_plan": self._update_task_status(state.get("task_plan", []), statuses),
            "actions_taken": [{"action": "run_tasks", "status_by_task": statuses}],
        }

    async def _publish(self, state: AgentState) -> Dict[str, Any]:
        deliverables = {
            "map_new_market_opportunities": state.get("t1_result", {}),
            "score_outbound_targets": state.get("t2_result", {}),
            "build_entry_strategy": state.get("t3_result", {}),
            "estimate_business_case": state.get("t4_result", {}),
        }
        output = {
            "agent": "executivo-negocios",
            "domain": "business_development",
            "role": "executivo_negocios",
            "status": self._overall_status(deliverables),
            "tasks": state.get("task_plan", []),
            "models": {"pipeline": state.get("role_model", {})},
            "deliverables": deliverables,
            "objective": "new_business",
        }
        return {"output": output, "actions_taken": [{"action": "publish", "status": output["status"]}]}

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
