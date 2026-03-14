import pytest

from agents.gerente_comercial.agent import GerenteComercialAgent


@pytest.mark.asyncio
async def test_gerente_comercial_agent_runs_pipeline():
    agent = GerenteComercialAgent()
    result = await agent.run({"context": {"profile": "enterprise", "lead_score": 88, "base_value": 200000, "confidence": 0.8}})

    output = result["output"]
    assert output["agent"] == "gerente-comercial"
    assert output["domain"] == "sales_management"
    assert output["status"] == "completed"
    assert len(output["tasks"]) == 4
    assert all(task["status"] == "completed" for task in output["tasks"])
