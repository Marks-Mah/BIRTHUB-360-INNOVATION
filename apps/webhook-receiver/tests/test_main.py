from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from fastapi import HTTPException
from fastapi.testclient import TestClient

MODULE_PATH = Path(__file__).resolve().parent.parent / "main.py"
MODULE_SPEC = spec_from_file_location("webhook_receiver_main", MODULE_PATH)
assert MODULE_SPEC and MODULE_SPEC.loader
webhook_main = module_from_spec(MODULE_SPEC)
MODULE_SPEC.loader.exec_module(webhook_main)


class DummyRedis:
    def __init__(self):
        self.events = []

    async def xadd(self, stream, payload):
        self.events.append({"payload": payload, "stream": stream})
        return "1-0"


def test_health_reports_service_ok():
    with TestClient(webhook_main.app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_stripe_webhook_dispatches_internal_patch_and_records_event(monkeypatch):
    captured_calls = []
    redis = DummyRedis()

    async def fake_patch(path, payload):
        captured_calls.append({"path": path, "payload": payload})

    monkeypatch.setattr(webhook_main, "_verify_svix_signature", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(webhook_main, "_patch", fake_patch)
    monkeypatch.setattr(webhook_main, "redis_client", redis)

    with TestClient(webhook_main.app) as client:
        response = client.post(
            "/webhooks/stripe",
            headers={
                "svix-id": "evt_1",
                "svix-signature": "signature",
                "svix-timestamp": "1700000000",
            },
            json={
                "data": {
                    "object": {
                        "metadata": {
                            "organizationId": "org_123"
                        }
                    }
                },
                "type": "payment_intent.succeeded",
            },
        )

    assert response.status_code == 200
    assert captured_calls == [
        {
            "path": "/api/v1/internal/organizations/org_123/plan",
            "payload": {"plan": "PRO"},
        }
    ]
    assert redis.events[0]["payload"]["type"] == "payment_intent.succeeded"


def test_invalid_svix_signature_returns_401(monkeypatch):
    monkeypatch.setattr(
        webhook_main,
        "_verify_svix_signature",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(HTTPException(status_code=401, detail="Invalid Svix signature")),
    )
    monkeypatch.setattr(webhook_main, "redis_client", DummyRedis())

    with TestClient(webhook_main.app) as client:
        response = client.post(
            "/webhooks/stripe",
            headers={
                "svix-id": "evt_1",
                "svix-signature": "bad",
                "svix-timestamp": "1700000000",
            },
            json={"data": {}, "type": "payment_intent.succeeded"},
        )

    assert response.status_code == 401
