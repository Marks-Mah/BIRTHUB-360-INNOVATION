from typing import Any, Dict

from pydantic import BaseModel, Field

class QueryAnalyticsInput(BaseModel):
    metric: str = Field(..., description="Metric to query (e.g., 'total_revenue', 'conversion_rate')")
    period: str = Field("last_30_days", description="Time period for the query")
    dimension: str = Field(None, description="Dimension to group by (e.g., 'campaign', 'source')")

class GenerateReportInput(BaseModel):
    title: str = Field(..., description="Title of the report")
    format: str = Field("markdown", description="Format of the report (markdown, pdf, csv)")
    sections: list[str] = Field(..., description="List of sections to include")

class ForecastInput(BaseModel):
    target_metric: str = Field(..., description="Metric to forecast")
    horizon: str = Field("next_3_months", description="Forecast horizon")


class AgentRequest(BaseModel):
    lead_id: str | None = None
    deal_id: str | None = None
    customer_id: str | None = None
    context: Dict[str, Any] = Field(default_factory=dict)
