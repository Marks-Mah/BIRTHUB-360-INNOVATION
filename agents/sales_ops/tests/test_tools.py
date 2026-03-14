import pytest

from agents.sales_ops.tools import audit_crm_hygiene, generate_ops_backlog


@pytest.mark.asyncio
async def test_sales_ops_tools_work():
    first = await audit_crm_hygiene({"lead_score": 81, "profile": "mid_market"})
    assert "score" in first

    projection = await generate_ops_backlog({"base_value": 150000, "confidence": 0.7})
    assert projection["projected_value"] == 105000.0
