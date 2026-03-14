import pytest
from agents.ae.agent import AEAgent

@pytest.mark.asyncio
async def test_ae_agent_runs():
    agent = AEAgent()
    result = await agent.run({"deal_id":"d1","context":{"deal_title":"Deal"}})
    assert "materials" in result["data"]
