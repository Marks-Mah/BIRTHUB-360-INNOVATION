import json
import os

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from redis.asyncio import Redis
from svix.webhooks import Webhook, WebhookVerificationError

app = FastAPI(title="birthub-webhook-receiver")

redis_client = Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:3001")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN")


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
        await client.patch(f"{API_GATEWAY_URL}{path}", json=payload, headers=headers)


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
    return {"status": "ok"}


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

    await redis_client.xadd("events", {"type": event_type, "data": json.dumps(payload)})
    return {"accepted": True, "processed": True}
