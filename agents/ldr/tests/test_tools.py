import pytest
from agents.ldr.tools import (
    score_icp,
    validate_email_smtp,
    enrich_technographic,
    check_financial_health
)

@pytest.mark.asyncio
async def test_score_icp_t1():
    """Lead com score alto deve ser T1"""
    data = {
        "revenue": "100M",
        "employees": 1000,
        "techStack": {"technologies": ["A", "B", "C"]},
        "industry": "SaaS",
        "location": "BR",
        "intent_signals": {"signals": [{"type": "hiring"}]}
    }
    criteria = {}
    result = await score_icp(data, criteria)

    assert "score" in result
    assert "tier" in result
    assert result["score"] >= 90 # Should be high with all these signals
    assert result["tier"] == "T1"

@pytest.mark.asyncio
async def test_validate_email_valid():
    email = "john@example.com"
    result = await validate_email_smtp(email)
    assert result["valid"] == True
    assert result["status"] == "valid"

@pytest.mark.asyncio
async def test_validate_email_invalid():
    email = "invalid-email"
    result = await validate_email_smtp(email)
    assert result["valid"] == False

@pytest.mark.asyncio
async def test_enrich_technographic():
    result = await enrich_technographic("example.com")
    assert "technologies" in result
    assert isinstance(result["technologies"], list)

@pytest.mark.asyncio
async def test_check_financial_health():
    result = await check_financial_health("123", "Acme")
    assert "health_score" in result
