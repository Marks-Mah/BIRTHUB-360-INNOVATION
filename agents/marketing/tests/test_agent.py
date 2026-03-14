import sys
import types

import pytest

from agents.marketing.agent import MarketingAgent


@pytest.mark.asyncio
async def test_marketing_agent_runs_pipeline():
    agent = MarketingAgent()
    result = await agent.run({"context": {"topic": "ABM", "url": "https://example.com/abm"}})

    output = result.data
    assert output["agent"] == "marketing"
    assert output["domain"] == "growth_marketing"
    assert output["status"] == "completed"
    assert len(output["tasks"]) == 3
    assert all(task["status"] == "completed" for task in output["tasks"])
    assert output["deliverables"]["seo_brief"]["ok"] is True
