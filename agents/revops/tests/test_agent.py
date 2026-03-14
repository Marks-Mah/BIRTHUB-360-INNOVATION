import pytest

from agents.revops.agent import RevOpsAgent


@pytest.mark.asyncio
async def test_revops_agent_runs_pipeline():
    agent = RevOpsAgent()
    result = await agent.run({"context": {"profile": "enterprise", "lead_score": 88, "base_value": 200000, "confidence": 0.8}})

    output = result["output"]
    assert output["agent"] == "revops"
    assert output["domain"] == "revenue_operations"
    assert output["status"] == "completed"
    assert len(output["tasks"]) == 4
    assert all(task["status"] == "completed" for task in output["tasks"])
