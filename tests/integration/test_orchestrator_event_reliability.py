import importlib.util
import sys
from pathlib import Path

from fastapi.testclient import TestClient


ORCHESTRATOR_MAIN_PATH = (
    Path(__file__).resolve().parents[2] / "apps" / "agent-orchestrator" / "main.py"
)


def _load_orchestrator_module():
    orchestrator_dir = str(ORCHESTRATOR_MAIN_PATH.parent)
    if orchestrator_dir not in sys.path:
        sys.path.append(orchestrator_dir)
    spec = importlib.util.spec_from_file_location("agent_orchestrator_main", ORCHESTRATOR_MAIN_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


class _SuccessGraph:
    async def ainvoke(self, state):
        return {"actions_taken": ["ok"], "entity_id": state["entity_id"]}


class _FailGraph:
    async def ainvoke(self, state):
        raise RuntimeError("graph exploded")


def test_run_event_is_idempotent(monkeypatch):
    orchestrator_module = _load_orchestrator_module()
    monkeypatch.setattr(orchestrator_module, "FLOW_RUNNERS", {"DEAL_CLOSED_WON": _SuccessGraph()})

    client = TestClient(orchestrator_module.app)
    payload = {
        "event_id": "evt-1",
        "event_type": "DEAL_CLOSED_WON",
        "entity_id": "deal-1",
        "context": {"amount": 100},
    }

    first = client.post("/run/event", json=payload)
    assert first.status_code == 200
    assert first.json()["status"] == "completed"

    second = client.post("/run/event", json=payload)
    assert second.status_code == 200
    assert second.json()["status"] == "duplicate"


def test_failed_event_goes_to_dlq_and_can_reprocess(monkeypatch):
    orchestrator_module = _load_orchestrator_module()
    monkeypatch.setattr(orchestrator_module, "FLOW_RUNNERS", {"HEALTH_ALERT": _FailGraph()})

    client = TestClient(orchestrator_module.app)
    payload = {
        "event_id": "evt-2",
        "event_type": "HEALTH_ALERT",
        "entity_id": "cust-9",
        "context": {"health": "red"},
    }

    response = client.post("/run/event", json=payload)
    assert response.status_code == 500

    dlq = client.get("/dlq")
    assert dlq.status_code == 200
    assert dlq.json()["size"] == 1

    monkeypatch.setattr(orchestrator_module, "FLOW_RUNNERS", {"HEALTH_ALERT": _SuccessGraph()})

    reprocess = client.post("/dlq/reprocess/evt-2")
    assert reprocess.status_code == 200
    assert reprocess.json()["status"] == "completed"

    after = client.get("/dlq")
    assert after.status_code == 200
    assert after.json()["size"] == 0


def test_metrics_endpoint_exposes_throughput(monkeypatch):
    orchestrator_module = _load_orchestrator_module()
    monkeypatch.setattr(orchestrator_module, "FLOW_RUNNERS", {"BOARD_REPORT": _SuccessGraph()})

    client = TestClient(orchestrator_module.app)
    payload = {
        "event_id": "evt-3",
        "event_type": "BOARD_REPORT",
        "entity_id": "board-weekly",
        "context": {},
    }

    response = client.post("/run/event", json=payload)
    assert response.status_code == 200

    metrics = client.get("/metrics/flows")
    assert metrics.status_code == 200
    board_metrics = metrics.json()["metrics"]["BOARD_REPORT"]
    assert board_metrics["throughput"] >= 1
    assert board_metrics["succeeded"] >= 1
