import pytest
from agents.sdr.tools import (
    auto_qualify_from_call,
    classify_objection,
    detect_optimal_send_time,
    generate_call_record,
    generate_icebreaker,
    run_prospecting_call,
)


@pytest.mark.asyncio
async def test_generate_icebreaker():
    lead = {"name": "Alice", "company": "Wonderland Inc"}
    result = await generate_icebreaker(lead, "Acquisition News", "")
    assert result["ok"] is True
    assert "Alice" in result["data"]


@pytest.mark.asyncio
async def test_detect_optimal_send_time():
    lead = {"role": "CEO"}
    result = await detect_optimal_send_time(lead)
    assert result["ok"] is True
    assert "best_day" in result["data"]


@pytest.mark.asyncio
async def test_classify_objection_rejection():
    reply = "I am not interested at all."
    result = await classify_objection(reply)
    assert result["data"]["category"] == "real_rejection"
    assert result["data"]["next_action"] == "close_lead"


@pytest.mark.asyncio
async def test_call_qualification_and_record():
    lead = {"id": "l-1", "name": "Pat", "company": "Acme", "is_decision_maker": True}
    script = {"opening": "Olá Pat, tudo bem?"}
    call_data = await run_prospecting_call(lead, script, ["budget", "authority", "need", "timeline"])
    qualification = await auto_qualify_from_call(call_data)
    record = await generate_call_record(call_data, qualification, lead)

    assert qualification["score"] >= 75
    assert "SDR:" in record["transcript"]
    assert record["lead"]["id"] == "l-1"
