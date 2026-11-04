import importlib.util
import os
import subprocess
import sys
from fastapi.testclient import TestClient
from backend.app import create_app
from backend.config import Settings


def test_settings_load_explicit_project_dotenv_without_overriding_process(tmp_path, monkeypatch):
    monkeypatch.delenv("SHIELDPAY_DB", raising=False)
    monkeypatch.delenv("SHIELDPAY_AI", raising=False)
    monkeypatch.setenv("SHIELDPAY_MODE", "demo")
    envfile = tmp_path / ".env"
    envfile.write_text("SHIELDPAY_MODE=sandbox\nSHIELDPAY_AI=lexical\nSHIELDPAY_DB=app-data.sqlite3\n", encoding="utf-8")
    import inspect
    assert "env_file" in inspect.signature(Settings.from_env).parameters, "Explicit root dotenv loading is not implemented"
    settings = Settings.from_env(env_file=envfile)
    assert settings.mode == "demo"
    assert settings.ai == "lexical"
    assert settings.db_path == "app-data.sqlite3"
    # dotenv modifies os.environ, so restore injected keys for other tests.
    monkeypatch.delenv("SHIELDPAY_DB", raising=False)
    monkeypatch.delenv("SHIELDPAY_AI", raising=False)


def test_built_frontend_is_served_without_masking_api_errors(tmp_path):
    import inspect
    assert "frontend_dist" in inspect.signature(create_app).parameters, "Built frontend serving is not implemented"
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>ShieldPay console</title>", encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log('ShieldPay')", encoding="utf-8")
    with TestClient(create_app(Settings(db_path=str(tmp_path / "db.sqlite3"), ai="lexical"), frontend_dist=dist)) as client:
        assert "ShieldPay console" in client.get("/").text
        assert "console.log" in client.get("/assets/app.js").text
        assert "ShieldPay console" in client.get("/review/case").text
        assert client.get("/api/no-such-resource").status_code == 404


def test_cli_has_runnable_warmup_entrypoint():
    assert importlib.util.find_spec("backend.cli") is not None, "ONNX warmup CLI is not implemented"
    result = subprocess.run([sys.executable, "-m", "backend.cli", "--help"], capture_output=True, text=True, check=False)
    assert result.returncode == 0
    assert "warmup" in result.stdout
