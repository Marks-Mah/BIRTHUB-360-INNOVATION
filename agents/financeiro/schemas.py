from typing import Any, Dict

from pydantic import BaseModel, Field

class GeneratePaymentInput(BaseModel):
    amount: float = Field(..., description="Amount to charge")
    description: str = Field(..., description="Description of the charge")
    method: str = Field("pix", description="Payment method (pix, boleto)")
    customer_id: str = Field(..., description="ID of the customer")

class EmitNFeInput(BaseModel):
    invoice_id: str = Field(..., description="ID of the invoice")
    tenant_id: str = Field(..., description="Tenant ID")

class ConciliateInput(BaseModel):
    start_date: str = Field(..., description="Start date for reconciliation")
    end_date: str = Field(..., description="End date for reconciliation")


class AgentRequest(BaseModel):
    lead_id: str | None = None
    deal_id: str | None = None
    customer_id: str | None = None
    context: Dict[str, Any] = Field(default_factory=dict)
