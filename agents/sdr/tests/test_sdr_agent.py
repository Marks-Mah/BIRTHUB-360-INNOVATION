import pytest
from unittest.mock import AsyncMock, patch

from agents.sdr.agent import SDRAgent


@pytest.mark.asyncio
async def test_sdr_agent_new_lead_flow_contains_call_qualification():
    agent = SDRAgent()

    initial_state = {
        "lead_id": "test-lead-1",
        "context": {
            "name": "Bob",
            "company": "Builder Corp",
            "role": "MANAGER",
            "type": "new_lead",
            "is_decision_maker": True,
        },
        "messages": [],
        "actions_taken": [],
        "output": {},
        "cadence_plan": None,
        "email_sequence": None,
        "meeting_slots": None,
        "objection_analysis": None,
    }

    with patch("agents.shared.base_agent.BaseAgent._log_to_db", new_callable=AsyncMock) as mock_log:
        result = await agent.run(initial_state)

        assert mock_log.called
        assert "outreach_plan" in result["output"]
        assert "call" in result["output"]
        assert "qualification" in result["output"]["call"]
        assert "transcript" in result["output"]["call"]["record"]


@pytest.mark.asyncio
async def test_sdr_agent_objection_flow():
    agent = SDRAgent()

    initial_state = {
        "lead_id": "test-lead-2",
        "context": {
            "type": "inbound_response",
            "email_body": "It's too expensive for us.",
        },
        "messages": [],
        "actions_taken": [],
        "output": {},
        "cadence_plan": None,
        "email_sequence": None,
        "meeting_slots": None,
        "objection_analysis": None,
    }

    with patch("agents.shared.base_agent.BaseAgent._log_to_db", new_callable=AsyncMock) as mock_log:
        result = await agent.run(initial_state)

        assert mock_log.called
        assert result["objection_analysis"]["category"] == "budget_concern"
        assert "classification" in result["output"]
