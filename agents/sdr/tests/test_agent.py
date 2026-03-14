import pytest

from agents.sdr.agent import SDRAgent


@pytest.mark.asyncio
async def test_sdr_agent_runs_with_prospecting_call_and_crm_transcript():
    agent = SDRAgent()
    result = await agent.run(
        {
            "lead_id": "l1",
            "context": {
                "name": "Ana",
                "company": "Acme",
                "phone": "+5511999999999",
                "has_budget": True,
                "is_decision_maker": True,
                "has_pain": True,
                "timeline": "30 dias",
            },
        }
    )

    assert "output" in result
    call = result["output"]["call"]
    assert call["qualification"]["qualified"] is True
    assert "SDR:" in call["record"]["transcript"]
    assert call["crm_sync"]["ok"] is True
    assert call["crm_sync"]["entity"] == "call_activity"
