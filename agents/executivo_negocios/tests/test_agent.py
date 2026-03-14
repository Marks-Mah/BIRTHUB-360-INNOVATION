import pytest

from agents.executivo_negocios.agent import ExecutivoNegociosAgent


@pytest.mark.asyncio
async def test_executivo_negocios_agent_runs_pipeline():
    agent = ExecutivoNegociosAgent()
    result = await agent.run({"context": {"profile": "enterprise", "lead_score": 88, "base_value": 200000, "confidence": 0.8}})

    output = result["output"]
    assert output["agent"] == "executivo-negocios"
    assert output["domain"] == "business_development"
    assert output["status"] == "completed"
    assert len(output["tasks"]) == 4
    assert all(task["status"] == "completed" for task in output["tasks"])
