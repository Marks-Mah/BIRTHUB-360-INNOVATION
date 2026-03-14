from pydantic import BaseModel, Field
from typing import Any, Dict


class JuridicoPayload(BaseModel):
    tenant_id: str = "unknown"
    context: Dict[str, Any] = Field(default_factory=dict)
