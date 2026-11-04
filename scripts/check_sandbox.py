"""Read-only sandbox readiness check. Never sends dispute evidence or money.

Run: uv run python scripts/check_sandbox.py
Writes sanitized status, never credentials or customer records.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.config import Settings


def check_connection(settings, paypal=None):
    from backend.paypal import PayPal, PayPalError
    if settings.mode != "sandbox" or not settings.paypal_configured:
        return {
            "at": datetime.now(timezone.utc).isoformat(),
            "environment": "sandbox",
            "status": "blocked",
            "network_tested": False,
            "oauth_and_disputes_verified": False,
            "remote_writes_sent": 0,
            "detail": "Set sandbox mode and credentials privately in the project .env. No network request was sent.",
        }
    adapter = paypal or PayPal(settings)
    try:
        details, since = adapter.list_disputes()
    except PayPalError as exc:
        return {
            "at": datetime.now(timezone.utc).isoformat(),
            "environment": "sandbox",
            "status": "failed",
            "network_tested": True,
            "oauth_and_disputes_verified": False,
            "remote_writes_sent": 0,
            "detail": exc.detail,
        }
    finally:
        if paypal is None:
            adapter.close()
    return {
        "at": datetime.now(timezone.utc).isoformat(),
        "environment": "sandbox",
        "status": "verified_reads",
        "network_tested": True,
        "oauth_and_disputes_verified": True,
        "remote_writes_sent": 0,
        "disputes_seen": len(details),
        "since": since,
        "detail": "OAuth and dispute reads completed. No evidence was sent. This does not verify evidence-write permissions or a dispute outcome.",
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default=str(ROOT / "artifacts" / "sandbox-verification.json"))
    args = parser.parse_args(argv)
    result = check_connection(Settings.from_env())
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0 if result["oauth_and_disputes_verified"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
