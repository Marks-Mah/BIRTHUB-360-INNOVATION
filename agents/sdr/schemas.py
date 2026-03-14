from pydantic import BaseModel, Field

class EnrichLeadInput(BaseModel):
    email: str = Field(..., description="Email address of the lead to enrich")
    company_name: str = Field(..., description="Company name of the lead")

class CalculateBANTInput(BaseModel):
    budget: str = Field(..., description="Budget information")
    authority: str = Field(..., description="Decision maker authority level")
    need: str = Field(..., description="Pain points and needs")
    timeline: str = Field(..., description="Implementation timeline")

class AddToSequenceInput(BaseModel):
    lead_id: str = Field(..., description="ID of the lead to add to sequence")
    sequence_id: str = Field(..., description="ID of the email sequence")
