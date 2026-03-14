import pytest

from agents.pre_vendas.tools import qualify_discovery, estimate_fit_risk


@pytest.mark.asyncio
async def test_pre_vendas_tools_work():
    first = await qualify_discovery({"lead_score": 81, "profile": "mid_market"})
    assert "score" in first

    projection = await estimate_fit_risk({"base_value": 150000, "confidence": 0.7})
    assert projection["projected_value"] == 105000.0
