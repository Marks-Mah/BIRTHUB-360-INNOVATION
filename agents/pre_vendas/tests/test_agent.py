import pytest

from agents.pre_vendas.agent import PreVendasAgent


@pytest.mark.asyncio
async def test_pre_vendas_agent_runs_pipeline():
    agent = PreVendasAgent()
    result = await agent.run({"context": {"profile": "enterprise", "lead_score": 88, "base_value": 200000, "confidence": 0.8}})

    output = result["output"]
    assert output["agent"] == "pre-vendas"
    assert output["domain"] == "pre_sales"
    assert output["status"] == "completed"
    assert len(output["tasks"]) == 4
    assert all(task["status"] == "completed" for task in output["tasks"])
