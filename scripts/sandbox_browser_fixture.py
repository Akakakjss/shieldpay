"""Isolated synthetic sandbox-shaped fixture. Never use with real credentials."""
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.config import Settings
from backend.demo import seed
from backend.store import Store
from backend.app import create_app


def main():
    path = os.environ["SHIELDPAY_FIXTURE_DB"]
    store = Store(path)
    seed(store)
    original = store.get_case("DEMO-1042", "demo")
    case = {k: v for k, v in original.items() if k not in {"sources", "analysis", "audit", "evidence_count"}}
    case.update(id="PP-TEST-BROWSER", buyer="Synthetic browser fixture", summary="SYNTHETIC TEST FIXTURE. No real PayPal case, evidence or credentials.")
    store.put_case(case, "sandbox", sources=original["sources"])
    settings = Settings(mode="sandbox", ai="lexical", db_path=path, admin_token="synthetic-browser-only")
    import uvicorn
    uvicorn.run(create_app(settings), host="127.0.0.1", port=int(os.environ["SHIELDPAY_FIXTURE_PORT"]))


if __name__ == "__main__":
    main()
