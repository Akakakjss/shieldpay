import importlib.util


def test_demo_api_has_persistent_synthetic_cases_and_safe_health(tmp_path):
    assert importlib.util.find_spec("backend") is not None, "backend package is not implemented"
    from fastapi.testclient import TestClient
    from backend.app import create_app
    from backend.config import Settings

    settings = Settings(db_path=str(tmp_path / "state.db"), ai="lexical")
    with TestClient(create_app(settings)) as client:
        health = client.get("/api/health").json()
        assert health["status"] == "ok"
        assert health["mode"] == "demo"
        assert health["ai"]["provider"] == "lexical-baseline"
        assert health["ai"]["ready"] is False
        assert health["paypal"] == {"configured": False, "environment": "sandbox"}
        cases = client.get("/api/cases").json()
        assert len(cases) >= 3
        assert {x["risk"] for x in cases} == {"ready", "review", "blocked"}
        for case in cases:
            assert "synthetic" in case["summary"].lower()
            detail = client.get(f"/api/cases/{case['id']}").json()
            assert detail["analysis"] is None
            assert detail["sources"]
            assert all(len(s["sha256"]) == 64 for s in detail["sources"])
        assert client.get("/api/cases/not-found").status_code == 404
    with TestClient(create_app(settings)) as client:
        assert len(client.get("/api/cases").json()) == len(cases)
