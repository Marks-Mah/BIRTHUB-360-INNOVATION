import importlib.util
import os
import sys
import uuid
from pathlib import Path

from fastapi.testclient import TestClient

from agents.ae.main import app as ae_app
from agents.sdr.main import app as sdr_app


ORCHESTRATOR_MAIN_PATH = (
    Path(__file__).resolve().parents[2] / "apps" / "agent-orchestrator" / "main.py"
)


def _load_orchestrator_module(monkeypatch=None):
    orchestrator_dir = str(ORCHESTRATOR_MAIN_PATH.parent)
    if orchestrator_dir not in sys.path:
        sys.path.append(orchestrator_dir)
    if monkeypatch and not os.getenv("ORCHESTRATOR_STATE_DB_PATH"):
        monkeypatch.setenv("ORCHESTRATOR_STATE_DB_PATH", f"/tmp/orchestrator-test-{uuid.uuid4()}.db")
    spec = importlib.util.spec_from_file_location("agent_orchestrator_main", ORCHESTRATOR_MAIN_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_orchestrator_requires_internal_token_when_configured(monkeypatch):
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "svc-secret")
    orchestrator_module = _load_orchestrator_module(monkeypatch)
    orchestrator_app = orchestrator_module.app
    client = TestClient(orchestrator_app)

    response = client.post("/run/lifecycle", json={"lead_id": "lead-123", "context": {}})
    assert response.status_code == 401


def test_sdr_requires_internal_token_when_configured(monkeypatch):
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "svc-secret")
    client = TestClient(sdr_app)

    response = client.post("/run", json={"lead_id": "lead-123", "context": {}})
    assert response.status_code == 401


def test_ae_requires_internal_token_when_configured(monkeypatch):
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "svc-secret")
    client = TestClient(ae_app)

    response = client.post("/run", json={"deal_id": "deal-123", "context": {}})
    assert response.status_code == 401


def test_orchestrator_returns_schema_version_on_success(monkeypatch):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    orchestrator_module = _load_orchestrator_module()

    class _FakeGraph:
        async def ainvoke(self, _state):
            return {"actions_taken": ["ok"]}

    monkeypatch.setattr(orchestrator_module, "FLOW_LEAD_LIFECYCLE_GRAPH", _FakeGraph())

    client = TestClient(orchestrator_module.app)
    response = client.post("/run/lifecycle", json={"lead_id": "lead-123", "context": {}})

    assert response.status_code == 200
    assert response.json()["schemaVersion"] == "v1"


def test_orchestrator_lifecycle_response_contract(monkeypatch):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    orchestrator_module = _load_orchestrator_module()

    class _FakeGraph:
        async def ainvoke(self, _state):
            return {"actions_taken": ["ldr_enrich_completed"], "score": 88, "tier": "T2"}

    monkeypatch.setattr(orchestrator_module, "FLOW_LEAD_LIFECYCLE_GRAPH", _FakeGraph())

    client = TestClient(orchestrator_module.app)
    response = client.post("/run/lifecycle", json={"lead_id": "lead-123", "context": {"source": "ads"}})

    assert response.status_code == 200
    payload = response.json()
    assert payload["schemaVersion"] == "v1"
    assert payload["status"] == "completed"
    assert "result" in payload
    assert payload["result"]["tier"] == "T2"


def test_orchestrator_events_endpoints_require_internal_token_when_configured(monkeypatch):
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "svc-secret")
    orchestrator_module = _load_orchestrator_module(monkeypatch)
    client = TestClient(orchestrator_module.app)

    list_response = client.get("/events")
    assert list_response.status_code == 401

    summary_response = client.get("/events/summary")
    assert summary_response.status_code == 401
