import sys
import types

import pytest

from agents.analista.agent import AnalistaAgent


@pytest.mark.asyncio
async def test_analista_agent_runs_pipeline():
    agent = AnalistaAgent()
    result = await agent.run({"context": {"stage_from": 100, "stage_to": 35}})

    output = result.data
    assert output["agent"] == "analista"
    assert output["domain"] == "revenue_analytics"
    assert output["status"] == "completed"
    assert all(task["status"] == "completed" for task in output["tasks"])
    assert output["deliverables"]["funnel"]["ok"] is True
