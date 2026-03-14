import sys
import types

import pytest

from agents.financeiro.agent import FinanceiroAgent


@pytest.mark.asyncio
async def test_financeiro_agent_runs_pipeline():
    agent = FinanceiroAgent()
    result = await agent.run({"context": {"months_ahead": 4}})

    output = result.data
    assert output["agent"] == "financeiro"
    assert output["domain"] == "finance_ops"
    assert output["status"] == "completed"
    assert all(task["status"] == "completed" for task in output["tasks"])
    assert output["deliverables"]["cashflow"]["ok"] is True
