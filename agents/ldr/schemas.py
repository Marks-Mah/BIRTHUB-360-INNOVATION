from typing import Any, Dict, List

from pydantic import BaseModel, Field

class ScoreICPInput(BaseModel):
    revenue: str = Field(..., description="Annual revenue of the lead")
    employees: int = Field(..., description="Number of employees")
    industry: str = Field(..., description="Industry of the lead")
    tech_stack: list[str] = Field(..., description="Technologies used by the lead")
    tenant_id: str = Field(..., description="Tenant ID to fetch configuration")

class HandoffLeadInput(BaseModel):
    lead_id: str = Field(..., description="ID of the lead to hand off")
    score: int = Field(..., description="Final ICP score")
    notes: str = Field(..., description="Notes for the AE")


class LeadEnrichRequest(BaseModel):
    lead_id: str
    company_domain: str
    email: str | None = None


class LeadEnrichResponse(BaseModel):
    job_id: str
    status: str
    message: str


class ICPScoreRequest(BaseModel):
    lead_data: Dict[str, Any] = Field(default_factory=dict)


class ICPScoreResponse(BaseModel):
    score: int = 0
    tier: str = "T4"
    reasoning: str = ""
    missing_data: List[str] = Field(default_factory=list)


class RunRequest(BaseModel):
    lead_id: str | None = None
    context: Dict[str, Any] = Field(default_factory=dict)
