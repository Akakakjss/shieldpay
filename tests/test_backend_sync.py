import json
from datetime import datetime, timedelta, timezone
import httpx
from fastapi.testclient import TestClient
from backend.app import create_app
from backend.config import Settings

BASE = "https://api-m.sandbox.paypal.com"


def test_sync_paginates_fetches_details_and_never_synthesizes_evidence(tmp_path):
    settings = Settings(mode="sandbox", ai="lexical", db_path=str(tmp_path / "state.db"), admin_token="test-admin", paypal_client_id="fake", paypal_client_secret="fake")
    app = create_app(settings)
    due = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    calls = []
    def handle(request):
        calls.append(str(request.url))
        assert request.url.host == "api-m.sandbox.paypal.com"
        if request.url.path == "/v1/oauth2/token":
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        if request.url.path == "/v1/customer/disputes":
            if "next_page_token" not in request.url.params:
                import re
                assert re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z", request.url.params["start_time"]), "Sandbox list rejects timestamps without milliseconds"
                return httpx.Response(200, json={"items": [{"dispute_id": "PP-D-12345"}], "links": [{"rel": "next", "href": BASE + "/v1/customer/disputes?next_page_token=page2", "method": "GET"}]})
            return httpx.Response(200, json={"items": [{"dispute_id": "PP-D-12346"}], "links": []})
        return httpx.Response(200, json={"dispute_id": request.url.path.rsplit("/", 1)[-1], "status": "WAITING_FOR_SELLER_RESPONSE", "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", "seller_response_due_date": due,
            "dispute_amount": {"value": "45.50", "currency_code": "USD"}, "disputed_transactions": [{"seller_transaction_id": "TXN123", "buyer": {"name": "Sandbox Buyer"}}], "links": []})
    from backend.paypal import PayPal
    with httpx.Client(transport=httpx.MockTransport(handle)) as transport, TestClient(app) as client:
        app.state.paypal = PayPal(settings, transport)
        headers = {"X-Admin-Token": "test-admin"}
        client.headers.update(headers)
        response = client.post("/api/paypal/sync", headers=headers)
        assert response.status_code == 200, response.text
        assert response.json()["imported"] == 2
        assert "not built" not in response.json()["detail"]
        assert "import" in response.json()["detail"].lower()
        connection = client.get("/api/paypal/status").json()
        assert connection["network_tested"] is True
        assert "OAuth" in connection["detail"]
        cases = client.get("/api/cases").json()
        assert {c["id"] for c in cases} == {"PP-D-12345", "PP-D-12346"}
        assert all(c["evidence_count"] == 0 for c in cases)
        assert all(c["amount"] == 45.5 for c in cases)
        detail = client.get("/api/cases/PP-D-12345").json()
        assert detail["sources"] == []
        analysis = client.post("/api/cases/PP-D-12345/analyze", headers=headers).json()
        assert analysis["can_submit"] is False
        assert analysis["claims"] == []
        assert client.post("/api/cases/PP-D-12345/approve", headers=headers, json={"packet_hash": analysis["packet_hash"], "approved_by": "Alex"}).status_code == 409
        assert client.get("/api/cases/DEMO-1042").status_code == 404
        assert client.post("/api/paypal/sync", headers=headers).json()["imported"] == 2
        assert len(client.get("/api/cases").json()) == 2
    assert sum("next_page_token" in call for call in calls) == 2


def test_remote_write_without_matching_readback_is_only_accepted():
    from backend.paypal import PayPal
    def handle(request):
        if request.url.path == "/v1/oauth2/token":
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        if request.method == "POST":
            return httpx.Response(200, json={"links": []})
        return httpx.Response(200, json={"dispute_id": "PP-D-12345", "status": "WAITING_FOR_SELLER_RESPONSE", "evidences": [], "links": [{"rel": "provide-evidence", "method": "POST", "href": BASE + "/v1/customer/disputes/PP-D-12345/provide-evidence"}]})
    settings = Settings(mode="sandbox", paypal_client_id="fake", paypal_client_secret="fake")
    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        result = PayPal(settings, client).provide_evidence("PP-D-12345", b"%PDF-test", "approved packet notes", "approval-1")
    assert result["status"] == "accepted"
    assert result["verified"] is False
