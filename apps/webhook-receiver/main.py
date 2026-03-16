import json
import os
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from redis.asyncio import Redis
from svix.webhooks import Webhook, WebhookVerificationError

PRIMARY_API_URL = os.getenv("PRIMARY_API_URL") or os.getenv("API_URL")
API_GATEWAY_URL = os.getenv("API_GATEWAY_URL")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN")
redis_client: Redis | None = None


def _is_strict_runtime() -> bool:
    environment = (os.getenv("NODE_ENV") or os.getenv("ENVIRONMENT") or "development").lower()
    return environment not in {"dev", "development", "test"} or os.getenv("CI") == "true"


def _resolve_redis_url() -> str:
    configured = os.getenv("REDIS_URL")
    if configured:
        return configured
    if _is_strict_runtime():
        raise RuntimeError("REDIS_URL is required in strict runtime")
    return "redis://localhost:6379"


def _resolve_api_gateway_url() -> str:
    if API_GATEWAY_URL:
        return API_GATEWAY_URL
    if PRIMARY_API_URL:
        return PRIMARY_API_URL
    if _is_strict_runtime():
        raise RuntimeError("API_GATEWAY_URL or PRIMARY_API_URL is required in strict runtime")
    return "http://localhost:3000"


def _resolve_primary_api_url() -> str:
    if PRIMARY_API_URL:
        return PRIMARY_API_URL
    if API_GATEWAY_URL:
        return API_GATEWAY_URL
    if _is_strict_runtime():
        raise RuntimeError("PRIMARY_API_URL or API_URL is required in strict runtime")
    return "http://localhost:3000"


def _get_redis_client() -> Redis:
    global redis_client
    if redis_client is None:
        redis_client = Redis.from_url(_resolve_redis_url(), decode_responses=True)
    return redis_client


@asynccontextmanager
async def lifespan(_: FastAPI):
    if _is_strict_runtime() and not INTERNAL_SERVICE_TOKEN:
        raise RuntimeError("INTERNAL_SERVICE_TOKEN is required in strict runtime")
    if _is_strict_runtime() and not os.getenv("SVIX_WEBHOOK_SECRET"):
        raise RuntimeError("SVIX_WEBHOOK_SECRET is required in strict runtime")
    try:
        await _get_redis_client().ping()
    except Exception:
        if _is_strict_runtime():
            raise
    yield


app = FastAPI(title="birthub-webhook-receiver", lifespan=lifespan)


def _verify_svix_signature(
    body: bytes,
    svix_id: str | None,
    svix_timestamp: str | None,
    svix_signature: str | None,
) -> None:
    secret = os.getenv("SVIX_WEBHOOK_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="SVIX_WEBHOOK_SECRET is not configured")

    if not svix_id or not svix_timestamp or not svix_signature:
        raise HTTPException(status_code=401, detail="Missing Svix signature headers")

    webhook = Webhook(secret)
    try:
        webhook.verify(
            body,
            {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature,
            },
        )
    except WebhookVerificationError as exc:
        raise HTTPException(status_code=401, detail="Invalid Svix signature") from exc


async def _patch(path: str, payload: dict) -> None:
    headers = {"Content-Type": "application/json"}
    if INTERNAL_SERVICE_TOKEN:
        headers["x-service-token"] = INTERNAL_SERVICE_TOKEN

    async with httpx.AsyncClient(timeout=10) as client:
        await client.patch(f"{_resolve_api_gateway_url()}{path}", json=payload, headers=headers)


async def handle_payment_success(data: dict) -> None:
    organization_id = data.get("object", {}).get("metadata", {}).get("organizationId") or data.get("organizationId")
    if not organization_id:
        return
    await _patch(f"/api/v1/internal/organizations/{organization_id}/plan", {"plan": "PRO"})


async def handle_subscription_change(data: dict) -> None:
    organization_id = data.get("object", {}).get("metadata", {}).get("organizationId") or data.get("organizationId")
    plan = data.get("object", {}).get("metadata", {}).get("plan") or data.get("plan")
    if not organization_id or not plan:
        return
    await _patch(f"/api/v1/internal/organizations/{organization_id}/plan", {"plan": plan})


async def handle_email_open(data: dict) -> None:
    activity_id = data.get("activityId")
    if not activity_id:
        return
    await _patch(f"/api/v1/internal/activities/{activity_id}", {"status": "OPENED"})


@app.get("/health")
async def health() -> dict:
    if not _is_strict_runtime():
        return {"status": "ok"}

    services = {
        "redis": {"status": "up"},
        "primaryApi": {"status": "up"},
        "compatApi": {"status": "up"},
        "internalServiceToken": {"status": "up" if INTERNAL_SERVICE_TOKEN else "down"},
        "svixSecret": {"status": "up" if os.getenv("SVIX_WEBHOOK_SECRET") else "down"},
    }
    status = "ok"

    try:
        await _get_redis_client().ping()
    except Exception as exc:  # noqa: BLE001
        services["redis"] = {"status": "down", "message": str(exc)}
        status = "degraded"

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{_resolve_primary_api_url()}/health")
            response.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        services["primaryApi"] = {"status": "down", "message": str(exc)}
        status = "degraded"

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{_resolve_api_gateway_url()}/health")
            response.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        services["compatApi"] = {"status": "down", "message": str(exc)}
        status = "degraded"

    if _is_strict_runtime() and not INTERNAL_SERVICE_TOKEN:
        services["internalServiceToken"] = {
            "status": "down",
            "message": "INTERNAL_SERVICE_TOKEN is required in strict runtime",
        }
        status = "degraded"

    if _is_strict_runtime() and not os.getenv("SVIX_WEBHOOK_SECRET"):
        services["svixSecret"] = {
            "status": "down",
            "message": "SVIX_WEBHOOK_SECRET is required in strict runtime",
        }
        status = "degraded"

    return {"status": status, "services": services}


@app.post("/webhooks/{provider}")
async def receive_webhook(
    provider: str,
    request: Request,
    svix_id: str | None = Header(default=None),
    svix_timestamp: str | None = Header(default=None),
    svix_signature: str | None = Header(default=None),
) -> dict:
    body = await request.body()
    _verify_svix_signature(body, svix_id, svix_timestamp, svix_signature)
    payload = await request.json()
    event_type = payload.get("type", "unknown")

    if provider == "stripe":
        if event_type == "payment_intent.succeeded":
            await handle_payment_success(payload.get("data", {}))
        elif event_type == "customer.subscription.updated":
            await handle_subscription_change(payload.get("data", {}))

    elif provider == "resend":
        if event_type == "email.opened":
            await handle_email_open(payload.get("data", {}))

    await _get_redis_client().xadd("events", {"type": event_type, "data": json.dumps(payload)})
    return {"accepted": True, "processed": True}
