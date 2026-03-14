import pytest

from agents.inside_sales.agent import InsideSalesAgent


@pytest.mark.asyncio
async def test_inside_sales_agent_runs_pipeline():
    agent = InsideSalesAgent()
    result = await agent.run({"context": {"profile": "enterprise", "lead_score": 88, "base_value": 200000, "confidence": 0.8}})

    output = result["output"]
    assert output["agent"] == "inside-sales"
    assert output["domain"] == "inside_sales"
    assert output["status"] == "completed"
    assert len(output["tasks"]) == 4
    assert all(task["status"] == "completed" for task in output["tasks"])
