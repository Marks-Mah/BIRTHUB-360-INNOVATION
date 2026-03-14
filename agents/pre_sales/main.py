from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Dict, Any, Optional
from agents.pre_sales.agent import PreSalesAgent, PreSalesAgentState
from agents.shared.security import validate_internal_service_token
from agents.shared.operational_contract import enforce_operational_context

app = FastAPI(title="Pre-Sales Agent API", version="1.0")
agent = PreSalesAgent()

class PreSalesInput(BaseModel):
    lead_id: Optional[str] = None
    context: Dict[str, Any] = {}

@app.get("/health")
async def health_check():
    return {"status": "ok", "agent": "Pre-Sales"}

@app.post("/run", response_model=Dict[str, Any])
async def run_agent(input_data: PreSalesInput, x_service_token: str | None = Header(default=None)):
    try:
        validate_internal_service_token(x_service_token)
        initial_state: PreSalesAgentState = {
            "lead_id": input_data.lead_id,
            "context": enforce_operational_context(input_data.context),
            "messages": [],
            "actions_taken": [],
            "output": {},
            "error": None,
            "demo_env": None,
            "rfp_response": None,
            "feasibility_report": None
        }

        result = await agent.run(initial_state)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Port 8016 for Pre-Sales
    uvicorn.run(app, host="0.0.0.0", port=8016)
