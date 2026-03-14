import pytest

from agents.gerente_comercial.tools import build_team_forecast, prioritize_deals_for_review


@pytest.mark.asyncio
async def test_gerente_comercial_tools_work():
    first = await build_team_forecast({"lead_score": 81, "profile": "mid_market"})
    assert "score" in first

    projection = await prioritize_deals_for_review({"base_value": 150000, "confidence": 0.7})
    assert projection["projected_value"] == 105000.0
