from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class DealInput(BaseModel):
    id: str | None = None
    amount: float = 0.0
    stage_probability: float = 0.5
    fit_score: float = 0.7

    @field_validator("stage_probability", "fit_score")
    @classmethod
    def _prob_bounds(cls, value: float) -> float:
        return max(0.0, min(1.0, float(value)))


class StageInput(BaseModel):
    name: str
    avg_days: float = 0.0
    target_days: float = 1.0


class StakeholderInput(BaseModel):
    name: str
    role: str | None = None
    influence: float = 0.5
    alignment: float = 0.5


class CommercialToolInput(BaseModel):
    profile: str = "mid_market"
    lead_score: int = 70
    urgency: str = "medium"
    owner: str = "comercial"
    tenant_id: str | None = None
    lead_id: str | None = None
    account_id: str | None = None
    deal_id: str | None = None
    base_value: float = 100000.0
    confidence: float = 0.72
    highlights: List[str] = Field(default_factory=list)
    signals: List[str] = Field(default_factory=list)
    channels: List[Dict[str, Any]] = Field(default_factory=list)
    blockers: List[str] = Field(default_factory=list)
    deals: List[DealInput] = Field(default_factory=list)
    stages: List[StageInput] = Field(default_factory=list)
    stakeholders: List[StakeholderInput] = Field(default_factory=list)
    context: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("lead_score")
    @classmethod
    def _lead_score_bounds(cls, value: int) -> int:
        return max(0, min(100, int(value)))

    @field_validator("confidence")
    @classmethod
    def _confidence_bounds(cls, value: float) -> float:
        return max(0.0, min(1.0, float(value)))


class CommercialToolOutput(BaseModel):
    tool: str
    domain: str
    status: str = "completed"
    generated_at: str
    input_quality: Dict[str, Any]
    recommendations: List[str] = Field(default_factory=list)
    data: Dict[str, Any] = Field(default_factory=dict)



def normalize_input(context: Dict[str, Any]) -> CommercialToolInput:
    merged = {**context, "context": context}
    model = CommercialToolInput(**merged)
    return model


def build_payload(model: CommercialToolInput) -> Dict[str, Any]:
    payload = model.model_dump()
    payload["input_quality"] = {
        "has_ids": bool(model.lead_id or model.account_id or model.deal_id),
        "has_highlights": len(model.highlights) > 0,
        "has_stakeholders": len(model.stakeholders) > 0,
        "confidence": model.confidence,
    }
    return payload


def normalize_output(*, domain: str, tool_name: str, raw_result: Dict[str, Any], model: CommercialToolInput) -> Dict[str, Any]:
    recommendations: List[str] = []
    if isinstance(raw_result.get("next_actions"), list):
        recommendations.extend([str(x) for x in raw_result["next_actions"]])
    if isinstance(raw_result.get("actions"), list):
        recommendations.extend([str(x) for x in raw_result["actions"]])
    if not recommendations:
        recommendations = ["validar resultado", "executar próxima ação", "atualizar CRM"]

    envelope = CommercialToolOutput(
        tool=tool_name,
        domain=domain,
        generated_at=datetime.now(timezone.utc).isoformat(),
        input_quality={
            "lead_score": model.lead_score,
            "confidence": model.confidence,
            "highlights_count": len(model.highlights),
            "signals_count": len(model.signals),
        },
        recommendations=recommendations,
        data=raw_result,
    ).model_dump()

    # backward compatibility: keep raw keys at top-level
    return {**raw_result, "_meta": envelope}
