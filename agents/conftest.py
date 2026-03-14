from __future__ import annotations

import asyncio
import inspect
from typing import Any

try:
    import pytest_asyncio  # noqa: F401
except ModuleNotFoundError:  # pragma: no cover - environment dependent
    HAS_PYTEST_ASYNCIO = False
else:  # pragma: no cover - environment dependent
    HAS_PYTEST_ASYNCIO = True


def pytest_addoption(parser: Any) -> None:
    """Register asyncio ini option when pytest-asyncio is unavailable."""
    parser.addini(
        "asyncio_mode",
        "Compat option to avoid warnings when pytest-asyncio is not installed.",
        default="auto",
    )


def pytest_configure(config: Any) -> None:
    if not HAS_PYTEST_ASYNCIO:
        config.addinivalue_line("markers", "asyncio: mark test as asyncio")


def pytest_pyfunc_call(pyfuncitem: Any) -> bool | None:
    """Fallback async test runner only for environments without pytest-asyncio."""
    if HAS_PYTEST_ASYNCIO:
        return None

    testfunction = pyfuncitem.obj
    if not inspect.iscoroutinefunction(testfunction):
        return None

    kwargs = {arg: pyfuncitem.funcargs[arg] for arg in pyfuncitem._fixtureinfo.argnames}
    asyncio.run(testfunction(**kwargs))
    return True


import sys
import types


if "google.genai" not in sys.modules:
    genai_module = types.ModuleType("google.genai")

    class _DummyClient:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self.models = None

    genai_module.Client = _DummyClient
    sys.modules["google.genai"] = genai_module

    google_module = sys.modules.get("google")
    if google_module is None:
        google_module = types.ModuleType("google")
        sys.modules["google"] = google_module
    google_module.genai = genai_module
