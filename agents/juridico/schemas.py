from pydantic import BaseModel, Field

class GenerateContractInput(BaseModel):
    template_name: str = Field("standard_saas", description="Name of the template (standard_saas, nda, dpa)")
    parties: dict = Field(..., description="Details of the parties involved (Company & Client)")
    terms: dict = Field(..., description="Key contract terms (start_date, amount, renewal)")

class SendForSignatureInput(BaseModel):
    contract_id: str = Field(..., description="ID of the contract document")
    signers: list[dict] = Field(..., description="List of signers (name, email)")

class AnalyzeContractInput(BaseModel):
    contract_text: str = Field(..., description="Full text of the contract or clause to analyze")
    risk_threshold: str = Field("medium", description="Risk tolerance (low, medium, high)")
