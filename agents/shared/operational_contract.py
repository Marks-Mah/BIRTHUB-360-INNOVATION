from __future__ import annotations

from typing import Any, Dict

from fastapi import HTTPException


REQUIRED_CONTEXT_FIELDS = ("tenant_id", "request_id")


def enforce_operational_context(context: Dict[str, Any] | None) -> Dict[str, Any]:
    normalized_context = dict(context or {})

    missing_fields = [field for field in REQUIRED_CONTEXT_FIELDS if not normalized_context.get(field)]
    if missing_fields:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Missing mandatory operational context fields.",
                "missing_fields": missing_fields,
                "required_fields": list(REQUIRED_CONTEXT_FIELDS),
            },
        )

    event_id = normalized_context.get("event_id")
    normalized_context["operational_contract"] = {
        "tenant_id": normalized_context["tenant_id"],
        "request_id": normalized_context["request_id"],
        "event_id": event_id,
        "idempotency_key": event_id or normalized_context["request_id"],
    }

    return normalized_context
