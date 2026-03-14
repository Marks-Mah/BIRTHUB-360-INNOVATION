import os
from fastapi import FastAPI, HTTPException, BackgroundTasks, Header
from agents.ldr.agent import LDRAgent
from agents.ldr.schemas import LeadEnrichRequest, LeadEnrichResponse, ICPScoreRequest, ICPScoreResponse, RunRequest
from agents.shared.security import validate_internal_service_token
from agents.shared.db_pool import init_pool
from cuid2 import cuid_wrapper as cuid

app = FastAPI(title="LDR Agent API", version="0.1.0")

ldr_agent = LDRAgent()

@app.on_event("startup")
async def startup_event() -> None:
    if os.getenv("DATABASE_URL"):
        await init_pool()


def _validate_service_token(x_service_token: str | None) -> None:
    expected = os.getenv("INTERNAL_SERVICE_TOKEN")
    if not expected:
        return
    if not x_service_token or x_service_token != expected:
        raise HTTPException(status_code=401, detail="Invalid internal service token")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ldr-agent"}

@app.post("/enrich", response_model=LeadEnrichResponse)
async def enrich_lead(request: LeadEnrichRequest, background_tasks: BackgroundTasks):
    job_id = cuid()

    # In a real scenario, we'd push to BullMQ here.
    # For now, we'll run the agent logic in the background (or foreground for simplicity in this MVP step)

    # We will simulate the agent run
    async def run_agent_task(job_id: str, req: LeadEnrichRequest):
        state = {
            "lead_id": req.lead_id,
            "context": {
                "job_id": job_id,
                "company_domain": req.company_domain,
                "email": req.email
            },
            "messages": [],
            "actions_taken": []
        }
        await ldr_agent.run(state)

    background_tasks.add_task(run_agent_task, job_id, request)

    return LeadEnrichResponse(
        job_id=job_id,
        status="queued",
        message="Lead enrichment job started"
    )

@app.post("/run")
async def run_agent_endpoint(request: RunRequest, x_service_token: str | None = Header(default=None)):
    """
    Directly runs the agent workflow.
    Called by the worker.ts.
    """
    validate_internal_service_token(x_service_token)

    state = {
        "lead_id": request.lead_id,
        "context": request.context,
        "messages": [],
        "actions_taken": []
    }
    try:
        result = await ldr_agent.run(state)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/score", response_model=ICPScoreResponse)
async def score_lead_endpoint(request: ICPScoreRequest, x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    # Direct synchronous call example
    from agents.ldr.tools import score_icp
    from agents.ldr.agent import ICP_WEIGHTS

    result = await score_icp(request.lead_data, ICP_WEIGHTS)
    return ICPScoreResponse(**result)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
