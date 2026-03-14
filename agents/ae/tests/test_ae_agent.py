import pytest
from unittest.mock import AsyncMock, patch
from agents.ae.agent import AEAgent

@pytest.mark.asyncio
async def test_ae_agent_create_proposal_flow():
    agent = AEAgent()

    initial_state = {
        "deal_id": "test-deal-1",
        "context": {
            "intent": "create_content",
            "deal_title": "Enterprise License",
            "customer_data": {"employees": 500}
        },
        "messages": [],
        "actions_taken": [],
        "output": {},
        "risk_analysis": None,
        "win_probability": None,
        "proposal_data": None,
        "competitor_insights": None
    }

    with patch("agents.shared.base_agent.BaseAgent._log_to_db", new_callable=AsyncMock) as mock_log:
        result = await agent.run(initial_state)

        assert mock_log.called
        assert "materials" in result["data"]
        assert "proposal" in result["proposal_data"]
        assert "roi" in result["proposal_data"]

@pytest.mark.asyncio
async def test_ae_agent_validate_discount_flow():
    agent = AEAgent()

    initial_state = {
        "deal_id": "test-deal-2",
        "context": {
            "intent": "approve_discount",
            "discount_pct": 25.0
        },
        "messages": [],
        "actions_taken": [],
        "output": {},
        "risk_analysis": None,
        "win_probability": None,
        "proposal_data": None,
        "competitor_insights": None
    }

    with patch("agents.shared.base_agent.BaseAgent._log_to_db", new_callable=AsyncMock) as mock_log:
        result = await agent.run(initial_state)

        assert mock_log.called
        assert "discount_validation" in result["data"]
        assert result["data"]["discount_validation"]["approved"] is False
