from typing import Any, Dict, List, Optional

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from agents.shared.base_agent import BaseAgent, BaseAgentState
from agents.shared.tool_runtime import run_tool
from agents.revops.tools import build_revenue_alignment_map, simulate_revenue_scenarios, detect_forecast_drift, generate_revops_actions


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


class RevOpsAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="revops")

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
            {"task": "build_revenue_alignment_map", "status": "ready"},
            {"task": "simulate_revenue_scenarios", "status": "ready"},
            {"task": "detect_forecast_drift", "status": "ready"},
            {"task": "generate_revops_actions", "status": "ready"},
        ]
        return {
            "role_model": model.model_dump(),
            "task_plan": tasks,
            "actions_taken": [{"action": "prepare", "role": "revops", "task_count": 4}],
        }

    async def _run_tasks(self, state: AgentState) -> Dict[str, Any]:
        model = state.get("role_model", {})
        context = model.get("context", {})

        t1 = await run_tool(tool_name="revops.build_revenue_alignment_map", handler=build_revenue_alignment_map, payload={"context": context}, validation_model=ToolPayload, idempotent=True)
        t2 = await run_tool(tool_name="revops.simulate_revenue_scenarios", handler=simulate_revenue_scenarios, payload={"context": context}, validation_model=ToolPayload, idempotent=True)
        t3 = await run_tool(tool_name="revops.detect_forecast_drift", handler=detect_forecast_drift, payload={"context": context}, validation_model=ToolPayload, idempotent=True)
        t4 = await run_tool(tool_name="revops.generate_revops_actions", handler=generate_revops_actions, payload={"context": context}, validation_model=ToolPayload, idempotent=True)

        statuses = {
            "build_revenue_alignment_map": "completed" if t1.get("ok") else "failed",
            "simulate_revenue_scenarios": "completed" if t2.get("ok") else "failed",
            "detect_forecast_drift": "completed" if t3.get("ok") else "failed",
            "generate_revops_actions": "completed" if t4.get("ok") else "failed",
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
            "build_revenue_alignment_map": state.get("t1_result", {}),
            "simulate_revenue_scenarios": state.get("t2_result", {}),
            "detect_forecast_drift": state.get("t3_result", {}),
            "generate_revops_actions": state.get("t4_result", {}),
        }
        output = {
            "agent": "revops",
            "domain": "revenue_operations",
            "role": "revops",
            "status": self._overall_status(deliverables),
            "tasks": state.get("task_plan", []),
            "models": {"pipeline": state.get("role_model", {})},
            "deliverables": deliverables,
            "objective": "revenue_alignment",
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
