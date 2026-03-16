import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header
from .agent import FinanceiroAgent
from .schemas import AgentRequest
from agents.shared.security import validate_internal_service_token
from agents.shared.db_pool import init_pool

@asynccontextmanager
async def lifespan(_: FastAPI):
    if os.getenv("DATABASE_URL"):
        await init_pool()
    yield

app = FastAPI(title="birthub-financeiro-agent", lifespan=lifespan)
agent = FinanceiroAgent()

@app.get('/health')
async def health():
    return {'status':'ok','agent':'financeiro'}

@app.post('/run')
async def run(req: AgentRequest, x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    return await agent.run(req.model_dump())
