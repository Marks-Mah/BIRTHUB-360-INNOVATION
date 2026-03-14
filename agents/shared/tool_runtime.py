from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
import time
from collections.abc import Awaitable, Callable
from decimal import Decimal
from typing import Any, Mapping

from pydantic import BaseModel, ValidationError

logger = logging.getLogger("agents.tool_runtime")

_CACHE: dict[str, dict[str, Any]] = {}
_TOOL_REGISTRY: dict[str, Callable[..., Awaitable[Any]]] = {}

_SENSITIVE_KEYWORDS = {"password", "passwd", "secret", "token", "authorization", "api_key", "key", "cpf", "cnpj", "email", "phone", "credit_card"}
_EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
_CPF_RE = re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b")
_CARD_RE = re.compile(r"\b(?:\d[ -]*?){13,16}\b")


class ToolExecutionError(RuntimeError):
    """Raised when tool execution fails."""



def register_tool(name: str, handler: Callable[..., Awaitable[Any]]) -> None:
    _TOOL_REGISTRY[name] = handler


def get_tool(name: str) -> Callable[..., Awaitable[Any]]:
    if name not in _TOOL_REGISTRY:
        raise ToolExecutionError(f"Tool '{name}' is not registered")
    return _TOOL_REGISTRY[name]


def _normalize_for_json(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, Mapping):
        return {str(k): _normalize_for_json(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_normalize_for_json(v) for v in value]
    return str(value)


def redact_sensitive_data(value: Any) -> Any:
    value = _normalize_for_json(value)
    if isinstance(value, dict):
        redacted: dict[str, Any] = {}
        for key, item in value.items():
            lowered = key.lower()
            redacted[key] = "[REDACTED]" if any(token in lowered for token in _SENSITIVE_KEYWORDS) else redact_sensitive_data(item)
        return redacted
    if isinstance(value, list):
        return [redact_sensitive_data(item) for item in value]
    if isinstance(value, str):
        masked = _EMAIL_RE.sub("[REDACTED_EMAIL]", value)
        masked = _CPF_RE.sub("[REDACTED_CPF]", masked)
        return _CARD_RE.sub("[REDACTED_CARD]", masked)
    return value


def _estimate_cost_usd(input_payload: Any, output_payload: Any, elapsed_s: float) -> float:
    input_tokens = max(1, len(json.dumps(_normalize_for_json(input_payload), ensure_ascii=False)) // 4)
    output_tokens = max(1, len(json.dumps(_normalize_for_json(output_payload), ensure_ascii=False)) // 4)
    return round((input_tokens + output_tokens) * 0.0000005 + elapsed_s * 0.00001, 6)


def _cache_key(tool_name: str, payload: dict[str, Any]) -> str:
    raw = json.dumps({"tool": tool_name, "payload": _normalize_for_json(payload)}, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def run_tool(*, tool_name: str, handler: Callable[..., Awaitable[Any]] | None = None, payload: dict[str, Any], validation_model: type[BaseModel] | None = None, timeout_s: float = 10.0, idempotent: bool = False) -> dict[str, Any]:
    started = time.perf_counter()
    safe_payload = redact_sensitive_data(payload)
    try:
        if validation_model is not None:
            payload = validation_model(**payload).model_dump()

        if idempotent:
            key = _cache_key(tool_name, payload)
            if key in _CACHE:
                return {"ok": True, "data": _CACHE[key], "error": None, "meta": {"tool": tool_name, "cached": True, "duration_ms": 0, "cost_usd": 0.0}}

        tool_handler = handler or get_tool(tool_name)
        result = await asyncio.wait_for(tool_handler(**payload), timeout=timeout_s)
        normalized_result = _normalize_for_json(result)
        if idempotent:
            _CACHE[_cache_key(tool_name, payload)] = normalized_result

        elapsed = time.perf_counter() - started
        logger.info("Tool executed", extra={"tool": tool_name, "duration_ms": int(elapsed * 1000)})
        return {"ok": True, "data": normalized_result, "error": None, "meta": {"tool": tool_name, "cached": False, "duration_ms": int(elapsed * 1000), "cost_usd": _estimate_cost_usd(payload, normalized_result, elapsed)}}
    except asyncio.TimeoutError:
        elapsed = time.perf_counter() - started
        logger.warning("Tool timeout", extra={"tool": tool_name, "payload": safe_payload})
        return {"ok": False, "data": None, "error": f"Tool '{tool_name}' timed out after {timeout_s}s", "meta": {"tool": tool_name, "cached": False, "duration_ms": int(elapsed * 1000), "cost_usd": 0.0}}
    except ValidationError as exc:
        elapsed = time.perf_counter() - started
        return {"ok": False, "data": None, "error": f"Input validation failed: {exc.errors()}", "meta": {"tool": tool_name, "cached": False, "duration_ms": int(elapsed * 1000), "cost_usd": 0.0}}
    except Exception as exc:  # noqa: BLE001
        elapsed = time.perf_counter() - started
        logger.exception("Tool execution failure", extra={"tool": tool_name, "payload": safe_payload})
        return {"ok": False, "data": None, "error": str(exc), "meta": {"tool": tool_name, "cached": False, "duration_ms": int(elapsed * 1000), "cost_usd": 0.0}}
