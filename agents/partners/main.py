from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Dict, Any, Optional
from agents.partners.agent import PartnersAgent, PartnersAgentState
from agents.shared.security import validate_internal_service_token
from agents.shared.operational_contract import enforce_operational_context

app = FastAPI(title="Partners Agent API", version="1.0")
agent = PartnersAgent()

class PartnersInput(BaseModel):
    lead_id: Optional[str] = None
    context: Dict[str, Any] = {}

@app.get("/health")
async def health_check():
    return {"status": "ok", "agent": "Partners"}

@app.post("/run", response_model=Dict[str, Any])
async def run_agent(input_data: PartnersInput, x_service_token: str | None = Header(default=None)):
    try:
        validate_internal_service_token(x_service_token)
        initial_state: PartnersAgentState = {
            "lead_id": input_data.lead_id,
            "context": enforce_operational_context(input_data.context),
            "messages": [],
            "actions_taken": [],
            "output": {},
            "error": None,
            "registration_status": None,
            "commission_calc": None,
            "collateral_sent": None
        }

        result = await agent.run(initial_state)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Port 8014 for Partners
    uvicorn.run(app, host="0.0.0.0", port=8014)
