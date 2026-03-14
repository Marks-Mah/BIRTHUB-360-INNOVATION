from __future__ import annotations

import os
from typing import Any, Dict

import httpx

from agents.shared.errors import AgentToolError


async def invoke_live_tool(*, domain: str, tool_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    base_url = os.getenv("COMMERCIAL_TOOL_RUNTIME_URL")
    api_key = os.getenv("COMMERCIAL_TOOL_RUNTIME_API_KEY")
    if not base_url or not api_key:
        raise AgentToolError(
            code="MISSING_LIVE_RUNTIME_CONFIG",
            message="COMMERCIAL_TOOL_RUNTIME_URL e COMMERCIAL_TOOL_RUNTIME_API_KEY são obrigatórios",
        )

    url = f"{base_url.rstrip('/')}/v1/tools/execute"
    body = {"domain": domain, "tool": tool_name, "payload": payload}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=body, headers={"Authorization": f"Bearer {api_key}"})
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        raise AgentToolError(code="LIVE_RUNTIME_HTTP_ERROR", message="Falha ao executar ferramenta no runtime", details={"tool": tool_name, "error": str(exc)}) from exc

    result = data.get("result")
    if result is None:
        raise AgentToolError(code="LIVE_RUNTIME_INVALID_RESPONSE", message="Resposta do runtime sem campo result", details={"tool": tool_name})
    return result
