import pytest
from unittest.mock import AsyncMock, patch
from agents.ldr.agent import LDRAgent, LDRAgentState

@pytest.mark.asyncio
async def test_ldr_agent_flow():
    agent = LDRAgent()

    # Mock LLM and Tools if necessary (though tools are already mocked in tools.py)
    # The agent flow uses LangGraph which executes nodes.
    # We can run the agent with a sample input.

    initial_state = {
        "lead_id": "test-lead-1",
        "context": {
            "company_name": "Mega Corp",
            "company_domain": "megacorp.tech",
            "revenue": "500M",
            "employees": 5000
        },
        "messages": [],
        "actions_taken": [],
        "output": {},
        "error": None
    }

    # We need to mock DB logging in BaseAgent because we don't have a real DB connection in test env
    with patch("agents.shared.base_agent.BaseAgent._log_to_db", new_callable=AsyncMock) as mock_log:
        result = await agent.run(initial_state)

        assert mock_log.called
        assert "data" in result
        assert "score" in result["data"]
        assert result["data"]["tier"] in ["T1", "T2"]
