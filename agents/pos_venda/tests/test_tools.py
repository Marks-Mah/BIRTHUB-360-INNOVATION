import pytest
from agents.pos_venda.tools import (
    deflect_support_ticket,
    calculate_health_score,
    predict_churn_risk
)

@pytest.mark.asyncio
async def test_deflect_support_ticket_found():
    kb = ["Article 1: How to reset password"]
    result = await deflect_support_ticket("forgot password", kb)
    assert result["deflected"] is True
    assert "reset password" in result["solution"]
    assert result["confidence"] > 0.5

@pytest.mark.asyncio
async def test_deflect_support_ticket_not_found():
    kb = []
    result = await deflect_support_ticket("weird error", kb)
    assert result["deflected"] is False
    assert result["confidence"] < 0.5

@pytest.mark.asyncio
async def test_calculate_health_score():
    telemetry = {"login_frequency": 80}
    result = await calculate_health_score("c1", telemetry)
    assert result["score"] == 80
    assert result["status"] == "healthy"

@pytest.mark.asyncio
async def test_predict_churn_risk():
    behavior = {"payment_delays": 5, "login_drop": 20}
    # 5*0.1 + 20*0.01 = 0.5 + 0.2 = 0.7
    result = await predict_churn_risk("c1", behavior)
    assert result["risk_score"] == 0.7
    assert result["risk_category"] == "medium"
