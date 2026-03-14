from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class AgentCapability:
    agent_type: str
    description: str
    embedding: list[float]


class DelegationRouter:
    def __init__(self):
        self.capabilities: list[AgentCapability] = []

    def register_agent(self, agent_type: str, description: str, embedding: list[float]) -> None:
        self.capabilities.append(AgentCapability(agent_type=agent_type, description=description, embedding=embedding))

    def route(self, task: str, task_embedding: list[float]) -> str:
        if not self.capabilities:
            raise RuntimeError("No agent capabilities registered")
        best = max(self.capabilities, key=lambda capability: self._cosine(task_embedding, capability.embedding))
        return best.agent_type

    def _cosine(self, v1: list[float], v2: list[float]) -> float:
        dot = sum(a * b for a, b in zip(v1, v2))
        n1 = sum(a * a for a in v1) ** 0.5
        n2 = sum(a * a for a in v2) ** 0.5
        if n1 == 0 or n2 == 0:
            return 0.0
        return dot / (n1 * n2)
