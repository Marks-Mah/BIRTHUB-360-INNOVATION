import pytest

from agents.account_manager.agent import AccountManagerAgent


@pytest.mark.asyncio
async def test_account_manager_agent_runs_pipeline():
    agent = AccountManagerAgent()
    result = await agent.run({"context": {"profile": "enterprise", "lead_score": 88, "base_value": 200000, "confidence": 0.8}})

    output = result["output"]
    assert output["agent"] == "account-manager"
    assert output["domain"] == "account_management"
    assert output["status"] == "completed"
    assert len(output["tasks"]) == 4
    assert all(task["status"] == "completed" for task in output["tasks"])
