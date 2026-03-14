import pytest
import httpx

from agents.juridico.tools import analyze_contract, generate_contract, send_for_signature
from agents.shared.errors import AgentToolError


class _Response:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": "Contrato com responsabilidade ilimitada e foro internacional.",
                            }
                        ]
                    }
                }
            ]
        }


class _Client:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return None

    async def post(self, *_args, **_kwargs):
        if "contracts/generate" in _args[0]:
            return _ContractResponse()
        if "envelopes" in _args[0]:
            return _SignatureResponse()
        return _Response()


class _SignatureResponse:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return {"id": "env_123", "url": "https://sign.test/env_123", "status": "sent", "expiresAt": "2026-12-31T00:00:00Z"}


class _ContractResponse:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return {"contract_html": "<h1>MSA</h1>", "pdf_url": "https://contracts.test/ct_1.pdf", "variables_used": {"deal": {"id": "d_1"}}}


@pytest.mark.asyncio
async def test_analyze_contract_success(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "key")
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: _Client())

    result = await analyze_contract("https://file.test/contract.pdf", "MSA")

    assert result["risk_score"] >= 65
    assert len(result["red_flags"]) >= 1


@pytest.mark.asyncio
async def test_analyze_contract_missing_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(AgentToolError):
        await analyze_contract("https://file.test/contract.pdf", "MSA")


@pytest.mark.asyncio
async def test_send_for_signature_clicksign_success(monkeypatch):
    monkeypatch.setenv("CLICKSIGN_BASE_URL", "https://clicksign.test")
    monkeypatch.setenv("CLICKSIGN_API_KEY", "key")
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: _Client())

    result = await send_for_signature("ct_1", [{"email": "a@b.com"}], "clicksign")

    assert result["envelope_id"] == "env_123"
    assert result["status"] == "sent"


@pytest.mark.asyncio
async def test_send_for_signature_missing_config(monkeypatch):
    monkeypatch.delenv("CLICKSIGN_BASE_URL", raising=False)
    monkeypatch.delenv("CLICKSIGN_API_KEY", raising=False)

    with pytest.raises(AgentToolError):
        await send_for_signature("ct_1", [{"email": "a@b.com"}], "clicksign")


@pytest.mark.asyncio
async def test_generate_contract_success(monkeypatch):
    monkeypatch.setenv("CONTRACT_SERVICE_URL", "https://contracts.test")
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "token")
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: _Client())

    result = await generate_contract("MSA", {"id": "d_1"}, {"id": "c_1"})

    assert result["pdf_url"] == "https://contracts.test/ct_1.pdf"


@pytest.mark.asyncio
async def test_generate_contract_missing_config(monkeypatch):
    monkeypatch.delenv("CONTRACT_SERVICE_URL", raising=False)
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)

    with pytest.raises(AgentToolError):
        await generate_contract("MSA", {"id": "d_1"}, {"id": "c_1"})
