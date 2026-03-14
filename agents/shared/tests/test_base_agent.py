from unittest.mock import AsyncMock, MagicMock

import pytest

from agents.shared.base_agent import AgentResult, BaseAgent


class MockAgent(BaseAgent):
    def _build_graph(self):
        graph = MagicMock()
        graph.ainvoke = AsyncMock(return_value={"data": {"result": "success"}, "actions_taken": [], "error": None})
        return graph

    async def execute(self, task: str, payload: dict) -> AgentResult:
        return await self.run({"task": task, "context": payload, "tenantId": payload.get("tenant_id", "unknown")})


@pytest.mark.asyncio
async def test_base_agent_run(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake_key")
    BaseAgent._init_gemini = MagicMock(return_value=None)

    agent = MockAgent("test_agent", "gemini-1.5-pro")
    agent._log_to_db = AsyncMock()

    result = await agent.run({"jobId": "job-123", "tenantId": "tenant-1", "input": "test"})

    assert result.status == "success"
    assert result.data["result"] == "success"
    agent._log_to_db.assert_called()


@pytest.mark.asyncio
async def test_base_agent_rate_limit(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake_key")
    BaseAgent._init_gemini = MagicMock(return_value=None)

    agent = MockAgent("test_agent", "gemini-1.5-pro")
    agent._log_to_db = AsyncMock()
    agent.rate_limiter.check_and_increment = AsyncMock(side_effect=[(True, 1), (False, 2)])

    first_result = await agent.run({"jobId": "job-1", "tenantId": "tenant-1"})
    second_result = await agent.run({"jobId": "job-2", "tenantId": "tenant-1"})

    assert first_result.status == "success"
    assert second_result.status == "error"
    assert second_result.error == "rate_limit_exceeded"
