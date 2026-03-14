from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Step:
    id: str
    description: str
    agent_type: str
    tool: str
    input_schema: dict[str, Any]
    depends_on: list[str] = field(default_factory=list)


@dataclass
class Plan:
    goal: str
    steps: list[Step]


class Planner:
    """Builds a deterministic multi-step execution plan from a goal and context."""

    def create_plan(self, goal: str, context: dict[str, Any]) -> Plan:
        base_steps = [
            Step(
                id="step-1",
                description=f"Analisar objetivo e contexto para: {goal}",
                agent_type="analista",
                tool="analysis.summarize",
                input_schema={"goal": "string", "context": "object"},
                depends_on=[],
            ),
            Step(
                id="step-2",
                description="Executar ação principal com base na análise",
                agent_type=context.get("primary_agent", "marketing"),
                tool=context.get("primary_tool", "task.execute"),
                input_schema={"instructions": "string", "constraints": "object"},
                depends_on=["step-1"],
            ),
            Step(
                id="step-3",
                description="Validar resultado e gerar recomendação final",
                agent_type="analista",
                tool="analysis.evaluate",
                input_schema={"result": "object"},
                depends_on=["step-2"],
            ),
        ]
        self._validate_dependencies(base_steps)
        return Plan(goal=goal, steps=base_steps)

    def _validate_dependencies(self, steps: list[Step]) -> None:
        step_ids = {step.id for step in steps}
        for step in steps:
            invalid = [dependency for dependency in step.depends_on if dependency not in step_ids]
            if invalid:
                raise ValueError(f"Invalid depends_on refs in {step.id}: {invalid}")
