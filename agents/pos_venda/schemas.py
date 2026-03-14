from pydantic import BaseModel
from typing import Any, Dict

class AgentRequest(BaseModel):
    lead_id: str | None = None
    deal_id: str | None = None
    customer_id: str | None = None
    context: Dict[str, Any] = {}
