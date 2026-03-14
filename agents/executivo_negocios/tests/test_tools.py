import pytest

from agents.executivo_negocios.tools import map_new_market_opportunities, estimate_business_case


@pytest.mark.asyncio
async def test_executivo_negocios_tools_work():
    first = await map_new_market_opportunities({"lead_score": 81, "profile": "mid_market"})
    assert "score" in first

    projection = await estimate_business_case({"base_value": 150000, "confidence": 0.7})
    assert projection["projected_value"] == 105000.0
