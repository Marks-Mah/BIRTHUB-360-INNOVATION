from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Dict, Any, Optional
from agents.enablement.agent import EnablementAgent, EnablementAgentState
from agents.shared.security import validate_internal_service_token
from agents.shared.operational_contract import enforce_operational_context

app = FastAPI(title="Enablement Agent API", version="1.0")
agent = EnablementAgent()

class EnablementInput(BaseModel):
    lead_id: Optional[str] = None # Not always relevant, but part of standard schema
    context: Dict[str, Any] = {}

@app.get("/health")
async def health_check():
    return {"status": "ok", "agent": "Enablement"}

@app.post("/run", response_model=Dict[str, Any])
async def run_agent(input_data: EnablementInput, x_service_token: str | None = Header(default=None)):
    try:
        validate_internal_service_token(x_service_token)
        initial_state: EnablementAgentState = {
            "lead_id": input_data.lead_id,
            "context": enforce_operational_context(input_data.context),
            "messages": [],
            "actions_taken": [],
            "output": {},
            "error": None,
            "transcript_analysis": None,
            "coaching_card": None,
            "training_material": None
        }

        result = await agent.run(initial_state)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Port 8012 for Enablement
    uvicorn.run(app, host="0.0.0.0", port=8012)
