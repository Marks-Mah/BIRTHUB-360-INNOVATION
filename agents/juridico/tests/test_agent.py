import sys
import types

import pytest

from agents.juridico.agent import JuridicoAgent


@pytest.mark.asyncio
async def test_juridico_agent_runs_pipeline():
    agent = JuridicoAgent()
    result = await agent.run({"context": {"case_data": {"impact": 4, "probability": 3}}})

    output = result.data
    assert output["agent"] == "juridico"
    assert output["domain"] == "legal_ops"
    assert output["status"] == "completed"
    assert all(task["status"] == "completed" for task in output["tasks"])
    assert output["deliverables"]["risk"]["ok"] is True
