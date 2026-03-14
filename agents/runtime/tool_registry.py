from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


@dataclass
class ToolPolicy:
    allowed_roles: list[str]
    rate_limit_per_minute: int = 60


@dataclass
class ToolSpec:
    name: str
    handler: Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]]
    input_schema: dict[str, str]
    output_schema: dict[str, str]
    policy: ToolPolicy


class ToolRegistry:
    _instance: "ToolRegistry | None" = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._tools = {}
            cls._instance._usage = {}
        return cls._instance

    def register(self, name: str, handler: Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]], input_schema: dict[str, str], output_schema: dict[str, str], policy: ToolPolicy) -> None:
        self._tools[name] = ToolSpec(name=name, handler=handler, input_schema=input_schema, output_schema=output_schema, policy=policy)

    def get(self, name: str) -> ToolSpec:
        if name not in self._tools:
            raise KeyError(f"Tool not found: {name}")
        return self._tools[name]

    def execute(self, name: str, inputs: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        spec = self.get(name)
        self._validate_input(inputs, spec.input_schema)
        self._enforce_policy(spec, context)
        result = spec.handler(inputs, context)
        self._validate_output(result, spec.output_schema)
        return result

    def _validate_input(self, inputs: dict[str, Any], schema: dict[str, str]) -> None:
        for field in schema:
            if field not in inputs:
                raise ValueError(f"Missing input field: {field}")

    def _validate_output(self, output: dict[str, Any], schema: dict[str, str]) -> None:
        for field in schema:
            if field not in output:
                raise ValueError(f"Missing output field: {field}")

    def _enforce_policy(self, spec: ToolSpec, context: dict[str, Any]) -> None:
        role = context.get("role", "viewer")
        if role not in spec.policy.allowed_roles:
            raise PermissionError(f"Role '{role}' not allowed for tool '{spec.name}'")
