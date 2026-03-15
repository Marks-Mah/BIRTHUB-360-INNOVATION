from typing import Any, Dict

from pydantic import BaseModel, Field, HttpUrl

class UpdateDealStageInput(BaseModel):
    deal_id: str = Field(..., description="ID of the deal to update")
    new_stage: str = Field(..., description="New stage (e.g., 'Proposal', 'Negotiation', 'Closed Won')")
    notes: str = Field(..., description="Reason for the update")

class GenerateProposalInput(BaseModel):
    deal_id: str = Field(..., description="ID of the deal")
    amount: float = Field(..., description="Proposed amount")
    discount: float = Field(0, description="Discount percentage")
    template_id: str = Field("standard_saas", description="Template ID")

class ScheduleDemoInput(BaseModel):
    lead_id: str = Field(..., description="ID of the lead")
    proposed_times: list[str] = Field(..., description="List of proposed ISO timestamps")


class TranscribeAndSyncInput(BaseModel):
    recording_url: HttpUrl = Field(..., description="Public recording URL")
    deal_id: str = Field(..., min_length=1, description="Deal identifier")


class AEInput(BaseModel):
    deal_id: str | None = None
    context: Dict[str, Any] = Field(default_factory=dict)


class AEOutput(BaseModel):
    data: Dict[str, Any] = Field(default_factory=dict)
