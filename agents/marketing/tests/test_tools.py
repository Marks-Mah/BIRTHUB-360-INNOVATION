import pytest
import httpx

from agents.marketing.tools import generate_ad_copy, generate_content_calendar, optimize_budget, run_ab_test_analysis
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
                                "text": "Headline de Alta Conversão\nDescrição persuasiva para SaaS B2B.",
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
        if "content/calendar" in _args[0]:
            return _CalendarResponse()
        if "budget/optimize" in _args[0]:
            return _BudgetResponse()
        return _Response()


class _BudgetResponse:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return {"reallocations": [{"campaign_id": "cmp_1", "new_budget": 1200}]}


class _CalendarResponse:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return {"calendar": [{"week": 1, "topic": "revops", "formats": ["post"]}]}


@pytest.mark.asyncio
async def test_generate_ad_copy_success(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "key")
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: _Client())

    result = await generate_ad_copy("linkedin", "heads of sales", "book demos", "consultivo")

    assert "headline" in result
    assert len(result["variations"]) == 3

@pytest.mark.asyncio
async def test_run_ab_test_analysis_with_statistics():
    result = await run_ab_test_analysis("ab_1", ["A", "B"], {"A": [0.12, 0.13, 0.11], "B": [0.08, 0.07, 0.09]})
    assert result["winner"] == "A"
    assert "p_value" in result


@pytest.mark.asyncio
async def test_run_ab_test_analysis_invalid_metrics():
    with pytest.raises(AgentToolError):
        await run_ab_test_analysis("ab_1", ["A", "B"], {"A": [], "B": [0.1]})


@pytest.mark.asyncio
async def test_optimize_budget_success(monkeypatch):
    monkeypatch.setenv("MARKETING_OPTIMIZER_URL", "https://optimizer.test")
    monkeypatch.setenv("MARKETING_OPTIMIZER_API_KEY", "key")
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: _Client())

    result = await optimize_budget([{"id": "cmp_1", "budget": 900}], 1200, "2026-Q1")

    assert len(result["reallocations"]) == 1
    assert result["reallocations"][0]["campaign_id"] == "cmp_1"


@pytest.mark.asyncio
async def test_optimize_budget_missing_config(monkeypatch):
    monkeypatch.delenv("MARKETING_OPTIMIZER_URL", raising=False)
    monkeypatch.delenv("MARKETING_OPTIMIZER_API_KEY", raising=False)

    with pytest.raises(AgentToolError):
        await optimize_budget([{"id": "cmp_1", "budget": 900}], 1200, "2026-Q1")


@pytest.mark.asyncio
async def test_generate_content_calendar_success(monkeypatch):
    monkeypatch.setenv("CONTENT_PLANNER_URL", "https://planner.test")
    monkeypatch.setenv("CONTENT_PLANNER_API_KEY", "key")
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: _Client())

    result = await generate_content_calendar(["revops"], 1)

    assert len(result["calendar"]) == 1
    assert result["calendar"][0]["topic"] == "revops"


@pytest.mark.asyncio
async def test_generate_content_calendar_missing_config(monkeypatch):
    monkeypatch.delenv("CONTENT_PLANNER_URL", raising=False)
    monkeypatch.delenv("CONTENT_PLANNER_API_KEY", raising=False)

    with pytest.raises(AgentToolError):
        await generate_content_calendar(["revops"], 1)
