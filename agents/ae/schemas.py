from pydantic import BaseModel, Field

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
