import pytest

from agents.parcerias.agent import ParceriasAgent


@pytest.mark.asyncio
async def test_parcerias_agent_runs_pipeline():
    agent = ParceriasAgent()
    result = await agent.run({"context": {"profile": "enterprise", "lead_score": 88, "base_value": 200000, "confidence": 0.8}})

    output = result["output"]
    assert output["agent"] == "parcerias"
    assert output["domain"] == "partnership_sales"
    assert output["status"] == "completed"
    assert len(output["tasks"]) == 4
    assert all(task["status"] == "completed" for task in output["tasks"])
