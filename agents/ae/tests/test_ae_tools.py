import pytest
from agents.ae.tools import (
    generate_proposal,
    calculate_roi,
    get_battlecard,
    validate_discount
)

@pytest.mark.asyncio
async def test_generate_proposal():
    deal = {"id": "deal-123", "title": "Big Sale"}
    result = await generate_proposal(deal)
    assert "pdf_url" in result
    assert "deal-123" in result["pdf_url"]

@pytest.mark.asyncio
async def test_calculate_roi():
    customer = {"employees": 200, "avg_salary": 6000}
    config = {"price": 10000}
    result = await calculate_roi(customer, config)
    assert "key_metrics" in result
    assert result["key_metrics"]["annual_savings"] > 0

@pytest.mark.asyncio
async def test_get_battlecard():
    result = await get_battlecard("CompetitorX", {})
    assert result["competitor"] == "CompetitorX"
    assert len(result["weaknesses"]) > 0

@pytest.mark.asyncio
async def test_validate_discount():
    # Approved
    res1 = await validate_discount("d1", 10.0, "ae1")
    assert res1["approved"] is True

    # Rejected
    res2 = await validate_discount("d1", 30.0, "ae1")
    assert res2["approved"] is False
    assert res2["requires_approval"] is True


@pytest.mark.asyncio
async def test_transcribe_and_sync_call_default_path(monkeypatch):
    monkeypatch.delenv("CALL_TRANSCRIBE_ENDPOINT", raising=False)
    monkeypatch.delenv("CRM_SYNC_WEBHOOK", raising=False)

    from agents.ae.tools import transcribe_and_sync_call

    result = await transcribe_and_sync_call("https://example.com/call.mp3", "deal-1")
    assert result["crm_updated"] is True
    assert "transcript" in result


@pytest.mark.asyncio
async def test_transcribe_and_sync_call_rejects_invalid_payload():
    from pydantic import ValidationError
    from agents.ae.tools import transcribe_and_sync_call

    with pytest.raises(ValidationError):
        await transcribe_and_sync_call("not-a-url", "")
