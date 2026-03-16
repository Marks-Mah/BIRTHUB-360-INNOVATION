from fastapi.testclient import TestClient

import main as orchestrator_main


class DummyGraph:
    def __init__(self, payload):
        self.payload = payload

    async def ainvoke(self, _state):
        return self.payload


def test_health_reports_supported_flow_runners(monkeypatch):
    async def fake_init_db():
        return None

    async def fake_ping_database():
        return None

    monkeypatch.setattr(orchestrator_main, "init_db", fake_init_db)
    monkeypatch.setattr(orchestrator_main, "ping_database", fake_ping_database)

    with TestClient(orchestrator_main.app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["services"]["database"]["status"] == "up"
    assert "DEAL_CLOSED_WON" in payload["flows"]


def test_events_run_updates_metrics_and_task_log(monkeypatch):
    async def fake_init_db():
        return None

    recorded_tasks = []

    async def fake_upsert_agent_task(*args, **kwargs):
        recorded_tasks.append({"args": args, "kwargs": kwargs})

    monkeypatch.setattr(orchestrator_main, "init_db", fake_init_db)
    monkeypatch.setattr(orchestrator_main, "ping_database", fake_init_db)
    monkeypatch.setattr(orchestrator_main, "validate_internal_service_token", lambda _token: None)
    monkeypatch.setattr(orchestrator_main, "upsert_agent_task", fake_upsert_agent_task)
    monkeypatch.setitem(
        orchestrator_main.FLOW_RUNNERS,
        "DEAL_CLOSED_WON",
        DummyGraph({"summary": "completed", "verdict": "ok"}),
    )
    orchestrator_main.FLOW_METRICS.clear()

    with TestClient(orchestrator_main.app) as client:
        response = client.post(
            "/events/run",
            headers={"x-service-token": "svc_test"},
            json={
                "context": {"dealId": "deal_42"},
                "entity_id": "deal_42",
                "entityId": "deal_42",
                "event_id": "event_001",
                "event_type": "DEAL_CLOSED_WON",
                "tenant_id": "tenant_alpha",
            },
        )
        metrics = client.get(
            "/events/metrics",
            headers={"x-service-token": "svc_test"},
            params={"event_type": "DEAL_CLOSED_WON"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["result"]["summary"] == "completed"
    assert recorded_tasks
    assert metrics.status_code == 200
    assert metrics.json()["DEAL_CLOSED_WON"]["succeeded"] == 1


def test_events_run_uses_persisted_event_for_duplicate_detection(monkeypatch):
    async def fake_init_db():
        return None

    async def fake_get_agent_task(event_id):
        if event_id != "event_002":
            return None
        return {
            "context": {"dealId": "deal_88"},
            "created_at": "2026-03-16T00:00:00+00:00",
            "entity_id": "deal_88",
            "event_id": "event_002",
            "event_type": "DEAL_CLOSED_WON",
            "result": {"summary": "already-completed"},
            "status": "completed",
            "tenant_id": "tenant_alpha",
            "updated_at": "2026-03-16T00:01:00+00:00",
        }

    monkeypatch.setattr(orchestrator_main, "init_db", fake_init_db)
    monkeypatch.setattr(orchestrator_main, "ping_database", fake_init_db)
    monkeypatch.setattr(orchestrator_main, "get_agent_task", fake_get_agent_task)
    monkeypatch.setattr(orchestrator_main, "validate_internal_service_token", lambda _token: None)
    orchestrator_main.EVENT_STORE.clear()

    with TestClient(orchestrator_main.app) as client:
        response = client.post(
            "/events/run",
            headers={"x-service-token": "svc_test"},
            json={
                "context": {"dealId": "deal_88"},
                "entity_id": "deal_88",
                "event_id": "event_002",
                "event_type": "DEAL_CLOSED_WON",
                "tenant_id": "tenant_alpha",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "duplicate"
    assert payload["result"]["summary"] == "already-completed"
