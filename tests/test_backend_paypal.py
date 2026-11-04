import importlib.util
import json
import httpx
import pytest
from fastapi.testclient import TestClient
from backend.app import create_app
from backend.config import Settings

BASE = "https://api-m.sandbox.paypal.com"
DISPUTE = "PP-D-12345"
PATH = f"/v1/customer/disputes/{DISPUTE}"


def test_sandbox_http_adapter_oauth_hateoas_multipart_and_exact_readback():
    assert importlib.util.find_spec("backend.paypal") is not None, "PayPal adapter not implemented"
    from backend.paypal import PayPal
    calls = []
    evidence = []
    def handle(request):
        calls.append((request.method, str(request.url)))
        assert request.url.host == "api-m.sandbox.paypal.com"
        if request.url.path == "/v1/oauth2/token":
            assert request.headers["authorization"].startswith("Basic ")
            assert b"grant_type=client_credentials" in request.content
            return httpx.Response(200, json={"access_token": "test-only-token", "expires_in": 3600})
        assert request.headers["authorization"] == "Bearer test-only-token"
        if request.method == "GET":
            return httpx.Response(200, json={"dispute_id": DISPUTE, "status": "WAITING_FOR_SELLER_RESPONSE", "links": [{"rel": "provide-evidence", "method": "POST", "href": BASE + PATH + "/provide-evidence"}], "evidences": evidence.copy()})
        assert request.method == "POST"
        assert request.url.path == PATH + "/provide-evidence"
        assert "multipart/form-data; boundary=" in request.headers["content-type"]
        assert b'name="input"' in request.content
        assert b'name="evidence-file"' in request.content
        assert b"application/pdf" in request.content
        assert b"%PDF-" in request.content
        assert request.headers["paypal-request-id"] == "approval-1"
        evidence.append({"evidence_type": "PROOF_OF_FULFILLMENT", "source": "SUBMITTED_BY_SELLER", "notes": "ShieldPay packet " + "a" * 64, "documents": [{"name": "shieldpay-evidence.pdf"}]})
        return httpx.Response(200, json={"links": []})
    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        paypal = PayPal(Settings(mode="sandbox", paypal_client_id="fake-id", paypal_client_secret="fake-secret"), client)
        result = paypal.provide_evidence(DISPUTE, b"%PDF-test", "ShieldPay packet " + "a" * 64, "approval-1")
    assert result["status"] == "verified"
    assert result["verified"] is True
    assert [method for method,url in calls] == ["POST", "GET", "POST", "GET"]


@pytest.mark.parametrize("status,link", [
    ("UNDER_REVIEW", BASE + PATH + "/provide-evidence"),
    ("WAITING_FOR_SELLER_RESPONSE", None),
    ("WAITING_FOR_SELLER_RESPONSE", "https://evil.test/collect"),
    ("WAITING_FOR_SELLER_RESPONSE", "https://api-m.paypal.com" + PATH + "/provide-evidence"),
    ("WAITING_FOR_SELLER_RESPONSE", BASE + PATH + "/provide-evidence?redirect=1"),
    ("WAITING_FOR_SELLER_RESPONSE", BASE + "/v1/customer/disputes/OTHER/provide-evidence"),
])
def test_sandbox_rejects_forbidden_status_or_links_without_write(status, link):
    assert importlib.util.find_spec("backend.paypal") is not None, "PayPal adapter not implemented"
    from backend.paypal import PayPal, PayPalError
    writes = []
    def handle(request):
        if request.url.path == "/v1/oauth2/token":
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        if request.method != "GET":
            writes.append(request)
        return httpx.Response(200, json={"dispute_id": DISPUTE, "status": status, "links": [{"rel": "provide-evidence", "method": "POST", "href": link}] if link else []})
    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        paypal = PayPal(Settings(mode="sandbox", paypal_client_id="id", paypal_client_secret="secret"), client)
        with pytest.raises(PayPalError):
            paypal.provide_evidence(DISPUTE, b"%PDF-test", "human-approved notes", "approval")
    assert not writes


def test_sandbox_auth_sync_isolation_and_missing_credentials(tmp_path):
    settings = Settings(mode="sandbox", ai="lexical", db_path=str(tmp_path / "state.db"), admin_token="test-admin")
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/cases").status_code == 401
        assert client.get("/api/cases", headers={"X-Admin-Token": "test-admin"}).json() == []
        assert client.post("/api/paypal/sync").status_code == 401
        headers = {"X-Admin-Token": "test-admin"}
        assert client.post("/api/paypal/sync", headers=headers).status_code == 503
        assert client.post("/api/demo/reset", headers=headers).status_code == 409
        assert client.post("/api/cases/PP-D-12345/analyze").status_code == 401
        assert client.post("/api/cases/DEMO-1042/approve", json={"packet_hash": "a" * 64, "approved_by": "Alex"}).status_code == 401
        safe = client.get("/api/paypal/status").json()
        assert safe["configured"] is False
        assert "test-admin" not in json.dumps(safe)
    with TestClient(create_app(Settings(ai="lexical", db_path=str(tmp_path / "demo.db")))) as client:
        assert client.post("/api/paypal/sync").status_code == 409
