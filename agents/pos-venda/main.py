import os
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, Header
from pydantic import BaseModel, Field

from agents.shared.db_pool import init_pool
from agents.shared.security import validate_internal_service_token

from .agent import PosVendaAgent


class AgentRequest(BaseModel):
    lead_id: str | None = None
    deal_id: str | None = None
    customer_id: str | None = None
    context: Dict[str, Any] = Field(default_factory=dict)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if os.getenv("DATABASE_URL"):
        await init_pool()
    yield


app = FastAPI(title="birthub-pos-venda-agent", lifespan=lifespan)
agent = PosVendaAgent()


@app.get("/health")
async def health():
    return {"status": "ok", "agent": "pos-venda"}


@app.post("/run")
async def run(req: AgentRequest, x_service_token: str | None = Header(default=None)):
    validate_internal_service_token(x_service_token)
    return await agent.run(req.model_dump())
