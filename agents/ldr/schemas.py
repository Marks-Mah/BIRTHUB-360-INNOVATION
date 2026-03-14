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
