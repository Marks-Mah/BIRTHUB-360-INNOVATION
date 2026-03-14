import sys
from unittest.mock import MagicMock

def mock_module(name):
    if name not in sys.modules:
        m = MagicMock()
        sys.modules[name] = m
        return m

# Mock dependencies if they don't exist
try:
    import dotenv
except ImportError:
    mock_module("dotenv")

try:
    import langgraph
    import langgraph.graph
except ImportError:
    lg = mock_module("langgraph")
    lgg = mock_module("langgraph.graph")
    # StateGraph is used as type annotation and base class in some cases or just imported
    # BaseAgent imports StateGraph
    lgg.StateGraph = MagicMock

try:
    from google import genai
except ImportError:
    mock_module("google")
    mock_module("google.genai")

try:
    import asyncpg
except ImportError:
    mock_module("asyncpg")
