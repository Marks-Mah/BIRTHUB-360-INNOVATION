import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Dict, Any, Optional
from agents.sdr.agent import SDRAgent, SDRAgentState
from agents.sdr.schemas import SDRInput, SDROutput
from agents.shared.security import validate_internal_service_token
from agents.shared.db_pool import init_pool

@asynccontextmanager
async def lifespan(_: FastAPI):
    if os.getenv("DATABASE_URL"):
        await init_pool()
    yield

app = FastAPI(title="SDR Agent API", version="1.0", lifespan=lifespan)
agent = SDRAgent()

@app.get("/health")
async def health_check():
    return {"status": "ok", "agent": "SDR"}

@app.post("/run", response_model=Dict[str, Any])
async def run_agent(input_data: SDRInput, x_service_token: str | None = Header(default=None)):
    try:
        validate_internal_service_token(x_service_token)
        initial_state: SDRAgentState = {
            "lead_id": input_data.lead_id,
            "deal_id": None,
            "customer_id": None,
            "context": input_data.context or {},
            "messages": [],
            "actions_taken": [],
            "output": {},
            "error": None,
            "cadence_plan": None,
            "email_sequence": None,
            "meeting_slots": None,
            "objection_analysis": None
        }

        result = await agent.run(initial_state)
        return result.to_legacy_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
