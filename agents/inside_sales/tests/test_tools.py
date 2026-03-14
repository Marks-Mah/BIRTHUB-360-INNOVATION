import pytest

from agents.inside_sales.tools import prepare_offer, calculate_deal_readiness


@pytest.mark.asyncio
async def test_inside_sales_tools_work():
    first = await prepare_offer({"lead_score": 81, "profile": "mid_market"})
    assert "score" in first

    projection = await calculate_deal_readiness({"base_value": 150000, "confidence": 0.7})
    assert projection["projected_value"] == 105000.0
