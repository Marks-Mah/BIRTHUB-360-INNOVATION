import pytest

from agents.coordenador_comercial.agent import CoordenadorComercialAgent


@pytest.mark.asyncio
async def test_coordenador_comercial_agent_runs_pipeline():
    agent = CoordenadorComercialAgent()
    result = await agent.run({"context": {"profile": "enterprise", "lead_score": 88, "base_value": 200000, "confidence": 0.8}})

    output = result["output"]
    assert output["agent"] == "coordenador-comercial"
    assert output["domain"] == "sales_coordination"
    assert output["status"] == "completed"
    assert len(output["tasks"]) == 4
    assert all(task["status"] == "completed" for task in output["tasks"])
