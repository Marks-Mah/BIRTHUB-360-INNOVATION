import importlib.util
import sys
import types
from pathlib import Path

from fastapi.testclient import TestClient

from agents.analista.main import app as analista_app
from agents.financeiro.main import app as financeiro_app
from agents.juridico.main import app as juridico_app
from agents.marketing.main import app as marketing_app

POS_VENDA_DIR = Path(__file__).resolve().parents[2] / "agents" / "pos-venda"


def _load_pos_venda_app():
    package_name = "pos_venda"
    if package_name not in sys.modules:
        package = types.ModuleType(package_name)
        package.__path__ = [str(POS_VENDA_DIR)]
        sys.modules[package_name] = package

    spec = importlib.util.spec_from_file_location(
        f"{package_name}.main",
        POS_VENDA_DIR / "main.py",
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[f"{package_name}.main"] = module
    spec.loader.exec_module(module)
    return module.app


AGENT_APPS = [
    ("marketing", marketing_app),
    ("analista", analista_app),
    ("financeiro", financeiro_app),
    ("juridico", juridico_app),
]


def test_additional_agent_run_endpoints_require_internal_token(monkeypatch):
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "svc-secret")

    pos_venda_app = _load_pos_venda_app()
    apps = AGENT_APPS + [("pos-venda", pos_venda_app)]

    for _name, app in apps:
        client = TestClient(app)
        response = client.post("/run", json={"context": {}})
        assert response.status_code == 401


def test_additional_agent_run_endpoints_accept_valid_internal_token(monkeypatch):
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "svc-secret")

    pos_venda_app = _load_pos_venda_app()
    apps = AGENT_APPS + [("pos-venda", pos_venda_app)]

    for _name, app in apps:
        client = TestClient(app)
        response = client.post(
            "/run",
            json={"context": {}},
            headers={"x-service-token": "svc-secret"},
        )
        assert response.status_code == 200
