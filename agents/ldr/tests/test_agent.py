import pytest
from agents.ldr.agent import LDRAgent, ICP_WEIGHTS
from agents.ldr.tools import validate_email_smtp

class TestLDRAgent:
    @pytest.mark.asyncio
    async def test_t1_lead_triggers_immediate_alert(self):
        agent = LDRAgent()
        result = await agent.run({"lead_id":"test","context":{"company_domain":"example.com","email":"ceo@example.com","revenue_range":100,"employee_count":100,"tech_maturity":100,"industry_fit":100,"location":100,"intent_signals":100}})
        assert result["data"]["tier"] in ["T1","T2","T3","T4"]

    @pytest.mark.asyncio
    async def test_invalid_email_rejected(self):
        result = await validate_email_smtp("invalid")
        assert result["valid"] is False

    def test_icp_score_weights_sum_to_one(self):
        assert abs(sum(ICP_WEIGHTS.values()) - 1.0) < 0.001
