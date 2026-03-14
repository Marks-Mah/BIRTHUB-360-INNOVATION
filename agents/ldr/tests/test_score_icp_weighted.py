import pytest

from agents.ldr.tools import score_icp


@pytest.mark.asyncio
async def test_score_icp_weighted_infers_missing_fields_from_enrichment():
    lead_data = {
        "revenue": "500M",
        "employees": 5000,
        "tech_stack": {"technologies": ["React", "Python", "AWS"]},
        "intent_signals": {"signals": [{"type": "hiring"}]},
    }
    icp_criteria = {
        "weights": {
            "revenue_range": 0.25,
            "employee_count": 0.15,
            "tech_maturity": 0.20,
            "industry_fit": 0.20,
            "location": 0.05,
            "intent_signals": 0.15,
        },
        "tiers": {
            "T1": (90, 100),
            "T2": (70, 89),
            "T3": (50, 69),
            "T4": (0, 49),
        },
    }

    result = await score_icp(lead_data, icp_criteria)

    assert result["score"] >= 70
    assert result["tier"] in {"T1", "T2"}
    assert result["missing_data"] == []


@pytest.mark.asyncio
async def test_score_icp_weighted_reports_missing_fields_when_not_inferable():
    lead_data = {"revenue": "", "employees": 0}
    icp_criteria = {
        "weights": {
            "revenue_range": 0.25,
            "employee_count": 0.15,
            "tech_maturity": 0.20,
            "industry_fit": 0.20,
            "location": 0.05,
            "intent_signals": 0.15,
        }
    }

    result = await score_icp(lead_data, icp_criteria)

    assert result["tier"] in {"T3", "T4"}
    assert "revenue_range" in result["missing_data"]
    assert "employee_count" in result["missing_data"]
    assert "tech_maturity" in result["missing_data"]
    assert "intent_signals" in result["missing_data"]
