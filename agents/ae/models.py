from pydantic import BaseModel
from typing import Optional, Literal


class DealModel(BaseModel):
    deal_id: str
    tenant_id: str
    title: str
    stage: Literal["prospecting", "proposal", "negotiation", "closed_won", "closed_lost"] = "prospecting"
    amount: float = 0.0
    contract_id: Optional[str] = None
