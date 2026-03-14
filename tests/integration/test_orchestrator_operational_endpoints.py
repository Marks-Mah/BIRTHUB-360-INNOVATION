import importlib.util
import os
import sys
import uuid
from pathlib import Path

from fastapi.testclient import TestClient


ORCHESTRATOR_MAIN_PATH = (
    Path(__file__).resolve().parents[2] / "apps" / "agent-orchestrator" / "main.py"
)


def _load_orchestrator_module(monkeypatch):
    orchestrator_dir = str(ORCHESTRATOR_MAIN_PATH.parent)
    if orchestrator_dir not in sys.path:
        sys.path.append(orchestrator_dir)
    monkeypatch.setenv("ORCHESTRATOR_STATE_DB_PATH", f"/tmp/orchestrator-test-{uuid.uuid4()}.db")
    spec = importlib.util.spec_from_file_location("agent_orchestrator_main_ops", ORCHESTRATOR_MAIN_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


class _SuccessGraph:
    async def ainvoke(self, state):
        return {"actions_taken": ["ok"], "entity_id": state["entity_id"]}


def test_events_list_and_get_endpoints(monkeypatch):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    orchestrator_module = _load_orchestrator_module(monkeypatch)
    monkeypatch.setattr(orchestrator_module, "FLOW_RUNNERS", {"DEAL_CLOSED_WON": _SuccessGraph()})

    client = TestClient(orchestrator_module.app)
    payload = {
        "event_id": "evt-list-1",
        "event_type": "DEAL_CLOSED_WON",
        "entity_id": "deal-22",
        "context": {"mrr": 1000},
    }

    response = client.post("/run/event", json=payload)
    assert response.status_code == 200

    list_response = client.get("/events?status=completed&limit=10")
    assert list_response.status_code == 200
    assert list_response.json()["size"] == 1

    get_response = client.get("/events/evt-list-1")
    assert get_response.status_code == 200
    assert get_response.json()["event_type"] == "DEAL_CLOSED_WON"


def test_cancel_on_completed_event_keeps_completed_status(monkeypatch):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    orchestrator_module = _load_orchestrator_module(monkeypatch)
    monkeypatch.setattr(orchestrator_module, "FLOW_RUNNERS", {"DEAL_CLOSED_WON": _SuccessGraph()})

    client = TestClient(orchestrator_module.app)

    seed = {
        "event_id": "evt-cancel-1",
        "event_type": "DEAL_CLOSED_WON",
        "entity_id": "deal-40",
        "context": {},
    }
    first = client.post("/run/event", json=seed)
    assert first.status_code == 200

    cancel = client.post("/events/evt-cancel-1/cancel")
    assert cancel.status_code == 200

    rerun = client.post("/run/event", json=seed)
    assert rerun.status_code == 200
    assert rerun.json()["status"] == "duplicate"
