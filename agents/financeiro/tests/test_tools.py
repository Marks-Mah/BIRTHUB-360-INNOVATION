import pytest
import httpx

from agents.financeiro.tools import calculate_commissions, emit_nfe, manage_subscription_lifecycle, run_dunning_step, trigger_invoice
from agents.shared.errors import AgentToolError


class _Response:
    def __init__(self, payload: dict):
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class _Client:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return None

    async def post(self, *_args, **kwargs):
        if "dunning" in _args[0]:
            return _Response({"message_sent": True, "channel": "email", "next_step_at": "2026-01-01T00:00:00Z"})
        if "payments" in _args[0]:
            return _Response({"id": "pay_1", "status": "PENDING", "invoiceUrl": "https://asaas/pay_1"})
        return _Response({"chave_nfe": "NFE123", "url_danfe": "https://nfe/danfe", "url_xml": "https://nfe/xml", "status": "processando"})

    async def get(self, *_args, **_kwargs):
        if "commissions" in _args[0]:
            return _Response({"by_rep": [{"name": "AE 1", "total": 1350}], "total_liability": 1350})
        return _Response({"data": [{"status": "ACTIVE", "nextDueDate": "2026-02-01"}]})


@pytest.mark.asyncio
async def test_trigger_invoice_success(monkeypatch):
    monkeypatch.setenv("ASAAS_API_KEY", "key")
    monkeypatch.setenv("ASAAS_BASE_URL", "https://api.asaas.test")
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: _Client())

    result = await trigger_invoice("deal_1", {"customer_id": "cus_1", "amount": 150.5})

    assert result["invoice_id"] == "pay_1"
    assert result["payment_link"] == "https://asaas/pay_1"


@pytest.mark.asyncio
async def test_trigger_invoice_missing_config(monkeypatch):
    monkeypatch.delenv("ASAAS_API_KEY", raising=False)
    monkeypatch.delenv("ASAAS_BASE_URL", raising=False)
    with pytest.raises(AgentToolError):
        await trigger_invoice("deal_1", {"customer_id": "cus_1", "amount": 99})


@pytest.mark.asyncio
async def test_emit_nfe_success(monkeypatch):
    monkeypatch.setenv("FOCUS_NFE_TOKEN", "token")
    monkeypatch.setenv("FOCUS_NFE_BASE_URL", "https://focus.test")
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: _Client())

    result = await emit_nfe({"id": "inv_1"}, {"name": "Acme"})

    assert result["nfe_key"] == "NFE123"
    assert result["status"] == "processando"


@pytest.mark.asyncio
async def test_run_dunning_step_success(monkeypatch):
    monkeypatch.setenv("DUNNING_SERVICE_URL", "https://dunning.test")
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "token")
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: _Client())

    result = await run_dunning_step("inv_1", 1)

    assert result["message_sent"] is True
    assert result["channel"] == "email"


@pytest.mark.asyncio
async def test_manage_subscription_lifecycle_success(monkeypatch):
    monkeypatch.setenv("ASAAS_API_KEY", "key")
    monkeypatch.setenv("ASAAS_BASE_URL", "https://api.asaas.test")
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: _Client())

    result = await manage_subscription_lifecycle("cus_1")

    assert result["status"] == "ACTIVE"
    assert result["next_billing"] == "2026-02-01"


@pytest.mark.asyncio
async def test_run_dunning_step_missing_config(monkeypatch):
    monkeypatch.delenv("DUNNING_SERVICE_URL", raising=False)
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)

    with pytest.raises(AgentToolError):
        await run_dunning_step("inv_1", 1)


@pytest.mark.asyncio
async def test_calculate_commissions_success(monkeypatch):
    monkeypatch.setenv("COMMISSION_SERVICE_URL", "https://commission.test")
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "token")
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: _Client())

    result = await calculate_commissions("2026-02")

    assert result["total_liability"] == 1350
    assert result["by_rep"][0]["name"] == "AE 1"


@pytest.mark.asyncio
async def test_calculate_commissions_missing_config(monkeypatch):
    monkeypatch.delenv("COMMISSION_SERVICE_URL", raising=False)
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)

    with pytest.raises(AgentToolError):
        await calculate_commissions("2026-02")
