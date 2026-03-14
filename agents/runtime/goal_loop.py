from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Callable

from agents.runtime.evaluator import StepEvaluator
from agents.runtime.planner import Planner, Step


@dataclass
class GoalEvent:
    event_type: str
    payload: dict[str, Any]


class GoalLoop:
    def __init__(self, planner: Planner, evaluator: StepEvaluator, max_iterations: int = 10):
        self.planner = planner
        self.evaluator = evaluator
        self.max_iterations = max_iterations

    async def run(self, goal: str, context: dict[str, Any], step_executor: Callable[[Step, dict[str, Any]], Any], emit: Callable[[GoalEvent], None]) -> dict[str, Any]:
        emit(GoalEvent("goal.started", {"goal": goal}))
        plan = self.planner.create_plan(goal, context)

        results: dict[str, Any] = {}
        iteration = 0

        while iteration < self.max_iterations:
            iteration += 1
            progressed = False
            for step in plan.steps:
                if step.id in results:
                    continue
                if any(dep not in results for dep in step.depends_on):
                    continue

                emit(GoalEvent("step.planned", {"step_id": step.id, "description": step.description}))
                raw_result = await _maybe_await(step_executor(step, context))
                emit(GoalEvent("step.executed", {"step_id": step.id, "result": raw_result}))

                evaluation = self.evaluator.evaluate(raw_result, retries_done=0)
                emit(GoalEvent("step.evaluated", {"step_id": step.id, "score": evaluation.score, "decision": evaluation.decision}))

                if evaluation.decision == "proceed":
                    results[step.id] = raw_result
                    progressed = True
                elif evaluation.decision == "retry":
                    retried = await _maybe_await(step_executor(step, context))
                    retry_eval = self.evaluator.evaluate(retried, retries_done=1)
                    emit(GoalEvent("step.evaluated", {"step_id": step.id, "score": retry_eval.score, "decision": retry_eval.decision}))
                    if retry_eval.decision != "proceed":
                        emit(GoalEvent("goal.failed", {"reason": f"step {step.id} failed after retry"}))
                        return {"status": "failed", "results": results}
                    results[step.id] = retried
                    progressed = True
                else:
                    emit(GoalEvent("goal.failed", {"reason": f"step {step.id} escalated"}))
                    return {"status": "failed", "results": results}

            if len(results) == len(plan.steps):
                emit(GoalEvent("goal.completed", {"goal": goal, "steps": len(plan.steps)}))
                return {"status": "completed", "results": results}

            if not progressed:
                emit(GoalEvent("goal.failed", {"reason": "execution deadlock"}))
                return {"status": "failed", "results": results}

        emit(GoalEvent("goal.failed", {"reason": "max_iterations_exceeded"}))
        return {"status": "failed", "results": results}


async def _maybe_await(value):
    if asyncio.iscoroutine(value):
        return await value
    return value
