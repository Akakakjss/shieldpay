"""The setup helper never overwrites credentials or prints its generated token."""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_helper():
    path = ROOT / "scripts" / "setup_sandbox.py"
    assert path.is_file(), "Sandbox setup helper not implemented"
    spec = importlib.util.spec_from_file_location("sandbox_setup", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_setup_creates_private_sandbox_config_without_exposing_token(tmp_path, capsys):
    helper = load_helper()
    target = tmp_path / ".env"
    assert helper.create_config(target) is True
    text = target.read_text()
    assert "SHIELDPAY_MODE=sandbox" in text
    assert "SHIELDPAY_DB=data/sandbox.sqlite3" in text
    assert "PAYPAL_CLIENT_ID=\n" in text
    assert "PAYPAL_CLIENT_SECRET=\n" in text
    token = next(line.split("=", 1)[1] for line in text.splitlines() if line.startswith("SHIELDPAY_ADMIN_TOKEN="))
    assert len(token) >= 43
    assert token not in capsys.readouterr().out


def test_setup_preserves_existing_credentials(tmp_path):
    helper = load_helper()
    target = tmp_path / ".env"
    target.write_text("existing user configuration\n")
    assert helper.create_config(target) is False
    assert target.read_text() == "existing user configuration\n"
