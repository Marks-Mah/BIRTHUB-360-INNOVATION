import pytest

from agents.coordenador_comercial.tools import orchestrate_cadence_control, build_daily_execution_brief


@pytest.mark.asyncio
async def test_coordenador_comercial_tools_work():
    first = await orchestrate_cadence_control({"lead_score": 81, "profile": "mid_market"})
    assert "score" in first

    projection = await build_daily_execution_brief({"base_value": 150000, "confidence": 0.7})
    assert projection["projected_value"] == 105000.0
