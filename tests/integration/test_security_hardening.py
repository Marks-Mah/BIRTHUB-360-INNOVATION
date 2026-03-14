import importlib.util
import os
from pathlib import Path

from fastapi.testclient import TestClient

from agents.ldr.main import app as ldr_app


WEBHOOK_MAIN_PATH = Path(__file__).resolve().parents[2] / "apps" / "webhook-receiver" / "main.py"


def _load_webhook_module():
    spec = importlib.util.spec_from_file_location("webhook_receiver_main", WEBHOOK_MAIN_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_ldr_internal_endpoints_require_service_token(monkeypatch):
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "secret-token")
    client = TestClient(ldr_app)

    run_response = client.post("/run", json={"lead_id": "lead-1", "context": {}})
    assert run_response.status_code == 401

    score_response = client.post("/score", json={"lead_data": {}})
    assert score_response.status_code == 401


def test_ldr_internal_endpoints_accept_valid_service_token(monkeypatch):
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "secret-token")
    client = TestClient(ldr_app)

    response = client.post(
        "/score",
        json={"lead_data": {}},
        headers={"x-service-token": "secret-token"},
    )
    assert response.status_code == 200


def test_webhook_receiver_rejects_when_svix_secret_missing(monkeypatch):
    monkeypatch.delenv("SVIX_WEBHOOK_SECRET", raising=False)
    webhook_module = _load_webhook_module()

    client = TestClient(webhook_module.app)

    response = client.post(
        "/webhooks/stripe",
        headers={
            "svix-id": "msg_123",
            "svix-timestamp": "1700000000",
            "svix-signature": "v1,invalid",
        },
        json={"type": "invoice.paid"},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "SVIX_WEBHOOK_SECRET is not configured"
