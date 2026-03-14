import pytest

from agents.closer.agent import CloserAgent


@pytest.mark.asyncio
async def test_closer_agent_runs_pipeline():
    agent = CloserAgent()
    result = await agent.run({"context": {"profile": "enterprise", "lead_score": 88, "base_value": 200000, "confidence": 0.8}})

    output = result["output"]
    assert output["agent"] == "closer"
    assert output["domain"] == "closing"
    assert output["status"] == "completed"
    assert len(output["tasks"]) == 4
    assert all(task["status"] == "completed" for task in output["tasks"])
