"""Create a private, sandbox-only .env without printing or overwriting secrets.

Run: python scripts/setup_sandbox.py
Then open .env in your local editor and fill in your sandbox Client ID/Secret.
"""
from __future__ import annotations

import os
from pathlib import Path
import secrets

ROOT = Path(__file__).resolve().parents[1]


def create_config(target: Path) -> bool:
    token = secrets.token_urlsafe(32)
    text = (
        "# Private PayPal SANDBOX credentials. Never share, film, or commit this file.\n"
        "SHIELDPAY_MODE=sandbox\n"
        "SHIELDPAY_AI=onnx\n"
        "SHIELDPAY_DB=data/sandbox.sqlite3\n"
        "PAYPAL_CLIENT_ID=\n"
        "PAYPAL_CLIENT_SECRET=\n"
        f"SHIELDPAY_ADMIN_TOKEN={token}\n"
    )
    try:
        fd = os.open(target, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        return False
    with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as config:
        config.write(text)
    return True


def main() -> int:
    target = ROOT / ".env"
    if not create_config(target):
        print("Existing .env preserved unchanged. Open it locally to review sandbox configuration.")
        return 0
    print("Private .env created. Its admin token is generated and is NOT printed.")
    print("Open .env locally and fill PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET from your Sandbox app.")
    print("Keep Disputes enabled in the app settings. Never put production credentials here.")
    print("Run the connection check: uv run python scripts/check_sandbox.py")
    print("Then start a separate instance: python scripts/run.py --no-build --port 8788")
    print("Use http://127.0.0.1:8788 and enter the .env admin token into Settings; it stays in memory.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
