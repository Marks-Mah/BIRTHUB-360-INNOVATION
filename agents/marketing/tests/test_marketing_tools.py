import pytest
from agents.marketing.tools import generate_ad_copy

@pytest.mark.asyncio
async def test_generate_ad_copy():
    res = await generate_ad_copy("linkedin", "CTOs", "leads", "urgent")
    assert "headline" in res
    assert "CTOs" in res["description"]
