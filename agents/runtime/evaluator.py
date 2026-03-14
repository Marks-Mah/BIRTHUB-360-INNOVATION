from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Decision = Literal["proceed", "retry", "escalate"]


@dataclass
class Evaluation:
    score: float
    decision: Decision
    reason: str


class StepEvaluator:
    def __init__(self, retry_limit: int = 2, proceed_threshold: float = 0.75, escalate_threshold: float = 0.35):
        self.retry_limit = retry_limit
        self.proceed_threshold = proceed_threshold
        self.escalate_threshold = escalate_threshold

    def evaluate(self, step_result: dict, retries_done: int) -> Evaluation:
        quality = float(step_result.get("quality", 0.0))
        if quality >= self.proceed_threshold:
            return Evaluation(score=quality, decision="proceed", reason="Resultado com qualidade adequada.")
        if quality < self.escalate_threshold:
            return Evaluation(score=quality, decision="escalate", reason="Qualidade muito baixa para seguir automaticamente.")
        if retries_done < self.retry_limit:
            return Evaluation(score=quality, decision="retry", reason="Qualidade intermediária; nova tentativa recomendada.")
        return Evaluation(score=quality, decision="escalate", reason="Limite de retries atingido.")
