from pydantic import BaseModel, Field

class CreateCampaignInput(BaseModel):
    platform: str = Field(..., description="Platform (meta, google, linkedin)")
    name: str = Field(..., description="Campaign name")
    budget: float = Field(..., description="Daily budget")
    audience: str = Field(..., description="Target audience description")

class GenerateCopyInput(BaseModel):
    product: str = Field(..., description="Product name")
    persona: str = Field(..., description="Target persona")
    tone: str = Field("professional", description="Tone of voice")
    goal: str = Field("conversion", description="Goal (awareness, conversion)")

class GetCACReportInput(BaseModel):
    period: str = Field("last_month", description="Time period")
