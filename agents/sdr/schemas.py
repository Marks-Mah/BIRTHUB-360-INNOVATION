from typing import Any, Dict

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


class ScheduleMeetingInput(BaseModel):
    ae_calendar_id: str = Field(..., min_length=1)
    lead_timezone: str = Field(..., min_length=1)
    slots: int = Field(default=3, ge=1, le=10)


class SDRInput(BaseModel):
    lead_id: str | None = None
    context: Dict[str, Any] = Field(default_factory=dict)


class SDROutput(BaseModel):
    data: Dict[str, Any] = Field(default_factory=dict)
