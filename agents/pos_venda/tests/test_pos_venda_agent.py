import pytest
from unittest.mock import AsyncMock, patch
from agents.pos_venda.agent import PosVendaAgent

@pytest.mark.asyncio
async def test_pos_venda_agent_flow():
    agent = PosVendaAgent()
    state = {
        "customer_id": "c1",
        "context": {"telemetry": {"login_frequency": 5}},
        "messages": [], "actions_taken": [], "output": {},
        "health_data": None, "lead_id": None, "deal_id": None, "error": None
    }
    with patch("agents.shared.base_agent.BaseAgent._log_to_db", new_callable=AsyncMock):
        res = await agent.run(state)
        assert res["output"]["health_score"]["score"] == 100
