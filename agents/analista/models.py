from __future__ import annotations

from pydantic import BaseModel, Field


class AnalistaInput(BaseModel):
    tenantId: str = Field(min_length=1)
    board_metrics: dict = Field(default_factory=dict)
    pipeline: list[dict] = Field(default_factory=list)
    cohort: list[dict] = Field(default_factory=list)
    forecast_history: list[dict] = Field(default_factory=list)
