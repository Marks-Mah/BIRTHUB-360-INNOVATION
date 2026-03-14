import asyncio
import importlib.util
import sys
from pathlib import Path


FLOWS_PATH = (
    Path(__file__).resolve().parents[2]
    / "apps"
    / "agent-orchestrator"
    / "orchestrator"
    / "flows.py"
)


def _load_flows_module():
    orchestrator_dir = str(FLOWS_PATH.parents[1])
    if orchestrator_dir not in sys.path:
        sys.path.append(orchestrator_dir)

    spec = importlib.util.spec_from_file_location("agent_orchestrator_flows", FLOWS_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_churn_playbook_sends_churn_event(monkeypatch):
    flows_module = _load_flows_module()
    captured = {}

    async def fake_post(url, payload):
        captured["url"] = url
        captured["payload"] = payload

    monkeypatch.setattr(flows_module, "_post_with_retry", fake_post)

    state = {"entity_id": "cust-1", "context": {"health": "low"}, "actions_taken": [], "error": ""}
    result = asyncio.run(flows_module.pos_venda_trigger_churn_playbook(state))

    assert result["actions_taken"] == ["pos_venda_trigger_churn_playbook_requested"]
    assert captured["payload"]["event"] == "CHURN_RISK_HIGH"
