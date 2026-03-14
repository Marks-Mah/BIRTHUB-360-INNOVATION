from __future__ import annotations

from pydantic import BaseModel, Field


class FinanceiroInput(BaseModel):
    tenantId: str = Field(min_length=1)
    bank_entries: list[dict] = Field(default_factory=list)
    projected_revenue: list[float] = Field(default_factory=list)
    commissions: list[dict] = Field(default_factory=list)
    overdue_titles: list[dict] = Field(default_factory=list)
