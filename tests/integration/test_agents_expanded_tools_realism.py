import asyncio

import pytest

from agents.account_manager.tools import quantify_churn_exposure
from agents.closer.tools import calculate_contract_signature_risk
from agents.coordenador_comercial.tools import monitor_queue_aging
from agents.executivo_negocios.tools import estimate_partnership_roi
from agents.gerente_comercial.tools import calculate_rep_productivity_index
from agents.inside_sales.tools import calculate_speed_to_lead
from agents.parcerias.tools import track_partner_activation
from agents.pre_vendas.tools import calculate_discovery_coverage
from agents.revops.tools import calculate_revenue_leakage
from agents.sales_ops.tools import score_process_automation_readiness
from agents.shared.errors import AgentToolError


def test_new_expanded_tools_return_structured_outputs():
    churn = asyncio.run(quantify_churn_exposure({"mrr": 20000, "risk_pct": 0.2}))
    assert churn["churn_exposure"] == 4000

    signature = asyncio.run(calculate_contract_signature_risk({"days_to_close": 8, "pending_approvals": 2}))
    assert signature["signature_risk_score"] >= 0

    queue = asyncio.run(monitor_queue_aging({"aging_hours": [2, 4, 6]}))
    assert queue["avg_aging_hours"] == 4

    roi = asyncio.run(estimate_partnership_roi({"expected_revenue": 300000, "cost": 100000}))
    assert roi["roi"] == 2

    productivity = asyncio.run(calculate_rep_productivity_index({"meetings": 20, "proposals": 10, "wins": 4}))
    assert productivity["productivity_index"] > 0

    speed = asyncio.run(calculate_speed_to_lead({"first_touch_minutes": 10}))
    assert speed["sla_met"] is True

    activation = asyncio.run(track_partner_activation({"activated": 5, "invited": 10}))
    assert activation["activation_rate"] == 0.5

    discovery = asyncio.run(calculate_discovery_coverage({"answered_questions": 8, "total_questions": 10}))
    assert discovery["coverage"] == 0.8

    leakage = asyncio.run(calculate_revenue_leakage({"expected": 1000, "realized": 900}))
    assert leakage["leakage"] == 100

    readiness = asyncio.run(score_process_automation_readiness({"standardization": 80, "data_quality": 70}))
    assert readiness["readiness"] == 75


def test_new_expanded_tools_validate_inputs():
    with pytest.raises(AgentToolError):
        asyncio.run(quantify_churn_exposure({"mrr": 20000, "risk_pct": 1.2}))

    with pytest.raises(AgentToolError):
        asyncio.run(estimate_partnership_roi({"expected_revenue": 300000, "cost": 0}))
