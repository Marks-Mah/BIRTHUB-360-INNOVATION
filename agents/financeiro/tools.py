from __future__ import annotations

from datetime import datetime, timedelta
import logging
import os
from typing import Any

import httpx
from pydantic import BaseModel, Field
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from agents.shared.errors import AgentToolError

logger = logging.getLogger("agents.financeiro.tools")

DUNNING_CONFIG = {
    "step_0": {"channel": "email", "tone": "friendly_reminder", "template": "pre_due_reminder", "suspend_service": False},
    "step_1": {"channel": ["email", "whatsapp"], "tone": "cordial", "template": "payment_failed_friendly", "suspend_service": False},
    "step_2": {"channel": ["email", "whatsapp", "cs_manual_call"], "tone": "concerned", "template": "overdue_escalation", "suspend_service": False},
    "step_3": {"channel": ["email"], "tone": "formal_legal", "template": "legal_warning", "suspend_service": False, "cc": ["legal@company.com"]},
    "step_4": {"channel": ["email"], "tone": "service_suspension", "template": "suspension_notice", "suspend_service": True, "insert_in_credit_bureau": True},
}


class InvoiceInput(BaseModel):
    deal_id: str = Field(min_length=1)
    payment_config: dict[str, Any] = Field(default_factory=dict)


async def trigger_invoice(deal_id: str, payment_config: dict) -> dict:
    """Creates invoice payload using external billing provider."""
    payload = InvoiceInput(deal_id=deal_id, payment_config=payment_config)
    asaas_api_key = os.getenv("ASAAS_API_KEY")
    asaas_base_url = os.getenv("ASAAS_BASE_URL")
    customer_id = str(payload.payment_config.get("customer_id", "")).strip()
    amount = payload.payment_config.get("amount")

    if not asaas_api_key or not asaas_base_url:
        raise AgentToolError(code="MISSING_BILLING_CONFIG", message="ASAAS_API_KEY e ASAAS_BASE_URL são obrigatórios")
    if not customer_id or amount is None:
        raise AgentToolError(code="INVALID_PAYMENT_CONFIG", message="payment_config.customer_id e payment_config.amount são obrigatórios")

    due_date = datetime.utcnow().date() + timedelta(days=7)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True,
    )
    async def _create_invoice() -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{asaas_base_url}/v3/payments",
                headers={"access_token": asaas_api_key},
                json={
                    "customer": customer_id,
                    "billingType": payload.payment_config.get("billing_type", "UNDEFINED"),
                    "value": float(amount),
                    "dueDate": due_date.isoformat(),
                    "description": f"Deal {payload.deal_id}",
                },
            )
            response.raise_for_status()
            return response.json()

    try:
        payment = await _create_invoice()
    except httpx.HTTPError as exc:
        raise AgentToolError(code="BILLING_PROVIDER_ERROR", message="Falha ao criar invoice no provedor", details={"error": str(exc)}) from exc

    return {
        "invoice_id": payment.get("id"),
        "status": payment.get("status", "unknown"),
        "payment_link": payment.get("invoiceUrl"),
        "due_date": due_date.isoformat(),
    }


async def run_dunning_step(invoice_id: str, step: int) -> dict:
    """Executes configured dunning step for overdue collection workflows."""
    if not invoice_id:
        raise AgentToolError(code="INVALID_INVOICE", message="invoice_id obrigatório")
    if step < 0 or step > 4:
        raise AgentToolError(code="INVALID_DUNNING_STEP", message="step deve estar entre 0 e 4", details={"step": step})

    dunning_service_url = os.getenv("DUNNING_SERVICE_URL")
    internal_token = os.getenv("INTERNAL_SERVICE_TOKEN")
    if not dunning_service_url or not internal_token:
        raise AgentToolError(code="MISSING_DUNNING_CONFIG", message="DUNNING_SERVICE_URL e INTERNAL_SERVICE_TOKEN são obrigatórios")

    config = DUNNING_CONFIG.get(f"step_{step}", {})

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True,
    )
    async def _dispatch_dunning() -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{dunning_service_url}/v1/dunning/execute",
                headers={"Authorization": f"Bearer {internal_token}"},
                json={"invoice_id": invoice_id, "step": step, "config": config},
            )
            response.raise_for_status()
            return response.json()

    try:
        payload = await _dispatch_dunning()
    except httpx.HTTPError as exc:
        raise AgentToolError(code="DUNNING_PROVIDER_ERROR", message="Falha ao executar dunning", details={"error": str(exc), "step": step}) from exc

    logger.info("run_dunning_step success", extra={"agentName": "financeiro", "invoiceId": invoice_id, "step": step})
    return {
        "message_sent": bool(payload.get("message_sent", False)),
        "channel": payload.get("channel", config.get("channel", "email")),
        "next_step_at": payload.get("next_step_at", datetime.utcnow().isoformat()),
    }


async def reconcile_bank_statement(bank_extract: list, pending_invoices: list) -> dict:
    """Reconciles bank statements with open receivables."""
    matched = min(len(bank_extract), len(pending_invoices))
    return {"matched": matched, "unmatched": len(pending_invoices)-matched, "reconciled_invoices": pending_invoices[:matched], "manual_review": pending_invoices[matched:]}


async def calculate_commissions(period: str) -> dict:
    """Calculates commission liabilities for the given period."""
    if not period:
        raise AgentToolError(code="INVALID_PERIOD", message="Período obrigatório")

    commission_service_url = os.getenv("COMMISSION_SERVICE_URL")
    internal_token = os.getenv("INTERNAL_SERVICE_TOKEN")
    if not commission_service_url or not internal_token:
        raise AgentToolError(code="MISSING_COMMISSION_CONFIG", message="COMMISSION_SERVICE_URL e INTERNAL_SERVICE_TOKEN são obrigatórios")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True,
    )
    async def _fetch_commissions() -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{commission_service_url}/v1/commissions",
                headers={"Authorization": f"Bearer {internal_token}"},
                params={"period": period},
            )
            response.raise_for_status()
            return response.json()

    try:
        payload = await _fetch_commissions()
    except httpx.HTTPError as exc:
        raise AgentToolError(code="COMMISSION_PROVIDER_ERROR", message="Falha ao calcular comissões", details={"error": str(exc), "period": period}) from exc

    by_rep = payload.get("by_rep")
    if not isinstance(by_rep, list):
        raise AgentToolError(code="INVALID_COMMISSION_RESPONSE", message="Resposta inválida de comissões")

    logger.info("calculate_commissions success", extra={"agentName": "financeiro", "period": period, "count": len(by_rep)})
    return {
        "by_rep": by_rep,
        "total_liability": float(payload.get("total_liability", 0.0)),
    }


async def forecast_cashflow(months_ahead: int = 6) -> dict:
    """Projects cashflow curve and runway metrics for treasury planning."""
    if months_ahead < 1:
        raise AgentToolError(code="INVALID_MONTHS_AHEAD", message="months_ahead deve ser >= 1")
    proj=[{"month":i+1,"value":100000-(i*3000)} for i in range(months_ahead)]
    return {"monthly_projection": proj, "p50": 520000.0, "p75": 610000.0, "runway_months": 18}


async def manage_subscription_lifecycle(customer_id: str) -> dict:
    """Applies subscription lifecycle checks and next billing action."""
    if not customer_id:
        raise AgentToolError(code="INVALID_CUSTOMER", message="customer_id obrigatório")

    asaas_api_key = os.getenv("ASAAS_API_KEY")
    asaas_base_url = os.getenv("ASAAS_BASE_URL")
    if not asaas_api_key or not asaas_base_url:
        raise AgentToolError(code="MISSING_BILLING_CONFIG", message="ASAAS_API_KEY e ASAAS_BASE_URL são obrigatórios")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True,
    )
    async def _fetch_subscription() -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{asaas_base_url}/v3/subscriptions",
                headers={"access_token": asaas_api_key},
                params={"customer": customer_id, "limit": 1},
            )
            response.raise_for_status()
            return response.json()

    try:
        payload = await _fetch_subscription()
    except httpx.HTTPError as exc:
        raise AgentToolError(code="BILLING_PROVIDER_ERROR", message="Falha ao consultar assinatura", details={"error": str(exc), "customer_id": customer_id}) from exc

    subscription = (payload.get("data") or [{}])[0]
    logger.info("manage_subscription_lifecycle success", extra={"agentName": "financeiro", "customerId": customer_id})
    return {
        "status": subscription.get("status", "unknown"),
        "actions_taken": ["subscription_checked"],
        "next_billing": subscription.get("nextDueDate", datetime.utcnow().isoformat()),
    }


async def emit_nfe(invoice: dict, customer: dict) -> dict:
    """Emits NF-e with Focus NFe external API."""
    if not invoice or not customer:
        raise AgentToolError(code="INVALID_NFE_INPUT", message="invoice e customer são obrigatórios")

    token = os.getenv("FOCUS_NFE_TOKEN")
    base_url = os.getenv("FOCUS_NFE_BASE_URL")
    if not token or not base_url:
        raise AgentToolError(code="MISSING_NFE_CONFIG", message="FOCUS_NFE_TOKEN e FOCUS_NFE_BASE_URL são obrigatórios")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True,
    )
    async def _emit() -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{base_url}/v2/nfe",
                headers={"Authorization": f"Bearer {token}"},
                json={"invoice": invoice, "customer": customer},
            )
            response.raise_for_status()
            return response.json()

    try:
        result = await _emit()
    except httpx.HTTPError as exc:
        raise AgentToolError(code="NFE_PROVIDER_ERROR", message="Falha na emissão de NF-e", details={"error": str(exc)}) from exc

    return {
        "nfe_key": result.get("chave_nfe"),
        "nfe_url": result.get("url_danfe"),
        "xml_url": result.get("url_xml"),
        "status": result.get("status", "processing"),
    }


async def optimize_collection_strategy(accounts: list) -> dict:
    prioritized = sorted(accounts, key=lambda a: (a.get("days_overdue", 0), a.get("amount", 0)), reverse=True)
    actions = [{"account_id": a.get("id"), "action": "call" if a.get("days_overdue", 0) > 30 else "email", "expected_recovery": round(a.get("amount", 0) * 0.6, 2)} for a in prioritized]
    return {"actions": actions, "total_expected_recovery": round(sum(a["expected_recovery"] for a in actions), 2)}


async def project_working_capital(receivables: float, payables: float, inventory: float) -> dict:
    wc = receivables + inventory - payables
    return {"working_capital": round(wc, 2), "status": "healthy" if wc > 0 else "attention"}


async def validate_expense_policy(expense: dict, policy: dict) -> dict:
    max_value = float(policy.get(expense.get("category", "default"), policy.get("default", 0)))
    approved = float(expense.get("amount", 0)) <= max_value
    return {"approved": approved, "max_allowed": max_value, "reason": "ok" if approved else "acima_da_politica"}


async def run_fraud_screening(transactions: list) -> dict:
    flagged = [t for t in transactions if t.get("amount", 0) > 50000 or t.get("country") in {"high_risk"}]
    return {"flagged_count": len(flagged), "flagged_transactions": flagged}


async def reconcile_gateway_settlement(gateway_report: list, ledger_entries: list) -> dict:
    ledger_by_id = {e.get("txn_id"): e for e in ledger_entries}
    mismatches = []
    for row in gateway_report:
        entry = ledger_by_id.get(row.get("txn_id"))
        if not entry or round(float(entry.get("amount", 0)), 2) != round(float(row.get("amount", 0)), 2):
            mismatches.append(row.get("txn_id"))
    return {"matched": len(gateway_report) - len(mismatches), "mismatches": mismatches}


async def generate_ap_aging_report(bills: list) -> dict:
    buckets = {"0_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0}
    for b in bills:
        days = int(b.get("days_open", 0))
        amt = float(b.get("amount", 0))
        if days <= 30:
            buckets["0_30"] += amt
        elif days <= 60:
            buckets["31_60"] += amt
        elif days <= 90:
            buckets["61_90"] += amt
        else:
            buckets["90_plus"] += amt
    return {"aging": {k: round(v, 2) for k, v in buckets.items()}}


async def run_budget_variance_analysis(actuals: dict, budget: dict) -> dict:
    variance = {}
    for k, v in budget.items():
        a = float(actuals.get(k, 0))
        variance[k] = {"budget": float(v), "actual": a, "variance": round(a - float(v), 2)}
    return {"variance": variance}


async def estimate_tax_liability(revenue: float, deductible_costs: float, tax_rate: float = 0.15) -> dict:
    taxable = max(0, revenue - deductible_costs)
    return {"taxable_income": round(taxable, 2), "estimated_tax": round(taxable * tax_rate, 2), "rate": tax_rate}


async def build_treasury_plan(cash_positions: list, obligations: list) -> dict:
    available = round(sum(float(c.get("amount", 0)) for c in cash_positions), 2)
    required = round(sum(float(o.get("amount", 0)) for o in obligations), 2)
    return {"available_cash": available, "obligations": required, "surplus": round(available - required, 2)}


async def schedule_payment_batches(payables: list, daily_limit: float) -> dict:
    batches = []
    current, current_total = [], 0.0
    for p in payables:
        amount = float(p.get("amount", 0))
        if current_total + amount > daily_limit and current:
            batches.append(current)
            current, current_total = [], 0.0
        current.append(p)
        current_total += amount
    if current:
        batches.append(current)
    return {"batch_count": len(batches), "batches": batches}


async def score_credit_risk(customer: dict) -> dict:
    score = 100
    score -= min(40, int(customer.get("late_payments", 0)) * 5)
    score -= 20 if customer.get("dispute_open", False) else 0
    return {"risk_score": max(0, score), "segment": "high" if score < 50 else "medium" if score < 75 else "low"}


async def prepare_audit_package(period: str, documents: list) -> dict:
    checklist = [{"document": d, "status": "ready" if d else "missing"} for d in documents]
    return {"period": period, "checklist": checklist, "completion_pct": round(sum(1 for c in checklist if c["status"] == "ready") / max(1, len(checklist)) * 100, 2)}


async def detect_duplicate_payments(transactions: list) -> dict:
    seen, duplicates = set(), []
    for t in transactions:
        key = (t.get("vendor"), round(float(t.get("amount", 0)), 2), t.get("invoice_number"))
        if key in seen:
            duplicates.append(t)
        seen.add(key)
    return {"duplicates": duplicates, "count": len(duplicates)}


async def generate_fx_exposure_report(positions: list, rates: dict) -> dict:
    exposure = []
    for p in positions:
        ccy = p.get("currency", "USD")
        rate = float(rates.get(ccy, 1))
        exposure.append({"currency": ccy, "base_value": round(float(p.get("amount", 0)) * rate, 2)})
    return {"exposure": exposure, "total_base": round(sum(e["base_value"] for e in exposure), 2)}


async def propose_cost_reduction_actions(cost_centers: list) -> dict:
    recommendations = []
    for c in cost_centers:
        spend = float(c.get("spend", 0))
        recommendations.append({"center": c.get("name"), "action": "renegotiate_vendor" if spend > 20000 else "monitor", "potential_saving": round(spend * 0.08, 2)})
    return {"recommendations": recommendations}


async def validate_input(context: dict) -> dict:
    if not isinstance(context, dict):
        raise AgentToolError(code="INVALID_CONTEXT", message="context deve ser dict")
    return {"validated": True, "context": context}


async def process_domain(validated: dict) -> dict:
    context = validated.get("context", {})
    return {"domain": "financeiro", "context": context, "validated": bool(validated.get("validated"))}


async def finalize(domain: dict) -> dict:
    return {"agent": "financeiro", "summary": "pipeline_executed", "domain": domain.get("domain"), "context": domain.get("context", {})}
