from fastapi import HTTPException

from agents.shared.operational_contract import enforce_operational_context


def test_enforce_operational_context_requires_tenant_and_request_id() -> None:
    try:
        enforce_operational_context({"tenant_id": "tenant-1"})
    except HTTPException as exc:
        assert exc.status_code == 422
        detail = exc.detail
        assert detail["missing_fields"] == ["request_id"]
        return
    raise AssertionError("expected HTTPException when request_id is missing")


def test_enforce_operational_context_builds_idempotency_key_from_event_id() -> None:
    context = enforce_operational_context(
        {"tenant_id": "tenant-1", "request_id": "req-1", "event_id": "evt-1"}
    )
    assert context["operational_contract"]["idempotency_key"] == "evt-1"


def test_enforce_operational_context_falls_back_to_request_id() -> None:
    context = enforce_operational_context({"tenant_id": "tenant-1", "request_id": "req-1"})
    assert context["operational_contract"]["idempotency_key"] == "req-1"
