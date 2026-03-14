import pytest

from agents.sales_ops.agent import SalesOpsAgent


@pytest.mark.asyncio
async def test_sales_ops_agent_runs_pipeline():
    agent = SalesOpsAgent()
    result = await agent.run({"context": {"profile": "enterprise", "lead_score": 88, "base_value": 200000, "confidence": 0.8, "highlights": ["meta de receita", "risco de churn"]}})

    output = result["output"]
    assert output["agent"] == "sales-ops"
    assert output["domain"] == "sales_operations"
    assert output["status"] == "completed"
    assert len(output["tasks"]) == 5
    assert all(task["status"] == "completed" for task in output["tasks"])
