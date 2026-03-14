import pytest

from agents.revops.tools import build_revenue_alignment_map, generate_revops_actions


@pytest.mark.asyncio
async def test_revops_tools_work():
    first = await build_revenue_alignment_map({"lead_score": 81, "profile": "mid_market"})
    assert "score" in first

    projection = await generate_revops_actions({"base_value": 150000, "confidence": 0.7})
    assert projection["projected_value"] == 105000.0
