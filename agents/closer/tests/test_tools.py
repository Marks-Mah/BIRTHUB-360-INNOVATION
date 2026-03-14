import pytest

from agents.closer.tools import build_closing_strategy, generate_closing_checklist


@pytest.mark.asyncio
async def test_closer_tools_work():
    first = await build_closing_strategy({"lead_score": 81, "profile": "mid_market"})
    assert "score" in first

    projection = await generate_closing_checklist({"base_value": 150000, "confidence": 0.7})
    assert projection["projected_value"] == 105000.0
