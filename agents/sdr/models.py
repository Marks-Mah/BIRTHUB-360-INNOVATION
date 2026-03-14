from pydantic import BaseModel, Field
from typing import Optional, Literal


class BANTQualification(BaseModel):
    budget: Optional[str] = None
    authority: Optional[str] = None
    need: Optional[str] = None
    timeline: Optional[str] = None


class SDRLead(BaseModel):
    lead_id: str
    tenant_id: str
    email: str
    stage: Literal["new", "qualified", "disqualified"] = "new"
    bant: BANTQualification = Field(default_factory=BANTQualification)
