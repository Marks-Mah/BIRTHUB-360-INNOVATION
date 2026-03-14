import pytest

from agents.parcerias.tools import score_partner_fit, generate_enablement_pack


@pytest.mark.asyncio
async def test_parcerias_tools_work():
    first = await score_partner_fit({"lead_score": 81, "profile": "mid_market"})
    assert "score" in first

    projection = await generate_enablement_pack({"base_value": 150000, "confidence": 0.7})
    assert projection["projected_value"] == 105000.0
