from __future__ import annotations

from typing import Any, Dict


class AgentToolError(Exception):
    def __init__(self, message: str, *, code: str = "AGENT_TOOL_ERROR", details: Dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}

    def __str__(self) -> str:
        return self.message
