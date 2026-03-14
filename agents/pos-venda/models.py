from __future__ import annotations

from pydantic import BaseModel, Field


class PosVendaInput(BaseModel):
    tenantId: str = Field(min_length=1)
    customers: list[dict] = Field(default_factory=list)
    expansion_signals: list[dict] = Field(default_factory=list)
    nps_responses: list[dict] = Field(default_factory=list)
    renewals: list[dict] = Field(default_factory=list)
