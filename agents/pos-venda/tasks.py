from __future__ import annotations

from pydantic import BaseModel, Field


class PosVendaInput(BaseModel):
    tenantId: str = Field(min_length=1)
    customers: list[dict] = Field(default_factory=list)
    expansion_signals: list[dict] = Field(default_factory=list)
    nps_responses: list[dict] = Field(default_factory=list)
    renewals: list[dict] = Field(default_factory=list)


class PosVendaTaskPipeline:
    async def validate_input(self, payload: dict) -> PosVendaInput:
        return PosVendaInput.model_validate(payload)

    async def process_domain(self, validated: PosVendaInput) -> dict:
        churn_risk = [c for c in validated.customers if float(c.get("health", 100)) < 60]
        expansion = [s for s in validated.expansion_signals if s.get("signal") == "high_usage"]
        detractors = [n for n in validated.nps_responses if int(n.get("score", 10)) <= 6]
        actions = [
            {
                "accountId": item.get("accountId"),
                "action": "auto_sequence" if int(item.get("days_to_renewal", 999)) <= 90 else "monitor",
            }
            for item in validated.renewals
        ]
        return {
            "churn_prediction": {"at_risk": len(churn_risk)},
            "expansion_opportunity": {"opportunities": len(expansion)},
            "nps_workflow": {"detractors": len(detractors), "followup_required": len(detractors) > 0},
            "renewal_automation": {"actions": actions},
        }

    async def finalize(self, processed: dict) -> dict:
        return {"agent": "pos-venda", **processed}
