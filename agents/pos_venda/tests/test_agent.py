import importlib.util
from pathlib import Path
import sys
import types

import pytest

if "google" not in sys.modules:
    google = types.ModuleType("google")
    google.genai = types.SimpleNamespace(Client=lambda *args, **kwargs: types.SimpleNamespace(models=None))
    sys.modules["google"] = google

import pytest

import pytest

import pytest

import pytest

spec = importlib.util.spec_from_file_location('pos_venda_agent', Path(__file__).resolve().parents[1] / 'agent.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
PosVendaAgent = module.PosVendaAgent


@pytest.mark.asyncio
async def test_pos_venda_agent_runs_pipeline():
    agent = PosVendaAgent()
    result = await agent.run({"context": {"nps_response": {"score": 9}}})

    output = result.data
    assert output["agent"] == "pos-venda"
    assert output["domain"] == "customer_success"
    assert output["status"] == "completed"
    assert all(task["status"] == "completed" for task in output["tasks"])
    assert output["deliverables"]["nps"]["ok"] is True
