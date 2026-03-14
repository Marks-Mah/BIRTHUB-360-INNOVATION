import pytest

from agents.account_manager.tools import assess_account_health, estimate_net_revenue_retention


@pytest.mark.asyncio
async def test_account_manager_tools_work():
    first = await assess_account_health({"lead_score": 81, "profile": "mid_market"})
    assert "score" in first

    projection = await estimate_net_revenue_retention({"base_value": 150000, "confidence": 0.7})
    assert projection["projected_value"] == 105000.0
