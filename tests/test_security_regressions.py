"""Security regression checks use no real credentials and no external network."""
from fastapi.testclient import TestClient
from backend.app import create_app
from backend.config import Settings
import pytest


@pytest.mark.parametrize("method,path", [("GET", "/prefix/api/cases"), ("POST", "/prefix/api/paypal/sync")])
def test_root_path_cannot_hide_protected_sandbox_routes(tmp_path, method, path):
    app = create_app(Settings(mode="sandbox", ai="lexical", db_path=str(tmp_path / "prefix.db"), admin_token="regression-admin"))
    with TestClient(app, root_path="/prefix") as client:
        assert client.request(method, path).status_code == 401


def test_malformed_host_cannot_bypass_sandbox_authentication(tmp_path):
    app = create_app(Settings(mode="sandbox", ai="lexical", db_path=str(tmp_path / "sandbox.db"), admin_token="regression-admin"))
    with TestClient(app) as client:
        response = client.post("/api/paypal/sync", headers={"Host": "localhost/not-api?ignored="})
        assert response.status_code == 401
        assert response.json()["detail"] == "A valid X-Admin-Token is required for sandbox mutations"


def test_sandbox_sensitive_reads_require_authentication(tmp_path):
    app = create_app(Settings(mode="sandbox", ai="lexical", db_path=str(tmp_path / "sandbox.db"), admin_token="regression-admin"))
    with TestClient(app) as client:
        for path in ["/api/cases", "/api/cases/PP-D-TEST", "/api/cases/PP-D-TEST/packet.pdf", "/api/audit"]:
            response = client.get(path)
            assert response.status_code == 401, path
            assert client.get(path, headers={"X-Admin-Token": "wrong"}).status_code == 401
        assert client.get("/api/cases", headers={"X-Admin-Token": "regression-admin"}).json() == []
        assert client.get("/api/audit", headers={"X-Admin-Token": "regression-admin"}).json() == []
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/paypal/status").status_code == 200
