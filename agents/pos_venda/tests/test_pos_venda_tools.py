import pytest
from agents.pos_venda.tools import calculate_health_score

@pytest.mark.asyncio
async def test_calculate_health_score():
    res = await calculate_health_score("c1", {"login_frequency": 5})
    assert res["score"] == 100

    res_bad = await calculate_health_score("c2", {"login_frequency": 1})
    assert res_bad["score"] == 80
