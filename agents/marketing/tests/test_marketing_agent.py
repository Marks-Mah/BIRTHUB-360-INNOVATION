import pytest
from unittest.mock import AsyncMock, patch
from agents.marketing.agent import MarketingAgent

@pytest.mark.asyncio
async def test_marketing_agent_ad_flow():
    agent = MarketingAgent()
    state = {
        "context": {
            "task": "generate_ad",
            "platform": "google",
            "goal": "sales"
        },
        "messages": [],
        "actions_taken": [],
        "output": {},
        "campaign_data": None,
        "analysis_report": None,
        "lead_id": None, "deal_id": None, "customer_id": None, "error": None
    }
    with patch("agents.shared.base_agent.BaseAgent._log_to_db", new_callable=AsyncMock):
        res = await agent.run(state)
        assert "ad_copy" in res["output"]
