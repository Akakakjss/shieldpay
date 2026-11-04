import json
import os
from datetime import datetime, timedelta, timezone
import httpx
import pytest
from fastapi.testclient import TestClient
from backend.app import create_app
from backend.config import Settings
from backend.paypal import PayPal


@pytest.mark.skipif(os.getenv("SHIELDPAY_TEST_ONNX") != "1", reason="Runs real downloaded ONNX inference on CPU")
def test_real_ai_api_analysis_changes_actual_excerpt_order_and_reports_readiness(tmp_path):
    with TestClient(create_app(Settings(ai="onnx", db_path=str(tmp_path / "state.db")))) as client:
        assert client.get("/api/health").json()["ai"]["ready"] is False
        response = client.post("/api/cases/DEMO-1042/analyze")
        assert response.status_code == 200
        analysis = response.json()
        assert analysis["provider"] == "local-onnx"
        assert analysis["can_submit"] is True
        ids = [r["source_id"] for r in analysis["retrieval"]]
        assert len(ids) == 3
        assert "1042-unrelated" not in ids
        assert [claim["source_ids"][0] for claim in analysis["claims"]] == ids
        assert client.get("/api/health").json()["ai"]["ready"] is True


def test_sandbox_api_human_gate_multipart_and_idempotent_verified_readback(tmp_path):
    settings = Settings(mode="sandbox", ai="lexical", db_path=str(tmp_path / "state.db"), admin_token="admin", paypal_client_id="fake", paypal_client_secret="fake")
    app = create_app(settings)
    due = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    delivered_at = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    detail = {"dispute_id": "PP-D-12345", "status": "WAITING_FOR_SELLER_RESPONSE", "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", "seller_response_due_date": due,
              "dispute_amount": {"value": "15.00", "currency_code": "USD"}, "disputed_transactions": [{"seller_transaction_id": "TXN123"}],
              "links": [{"rel": "provide-evidence", "method": "POST", "href": "https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-12345/provide-evidence"}], "evidences": []}
    writes = []
    def handle(request):
        if request.url.path == "/v1/oauth2/token":
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        if request.url.path == "/v1/customer/disputes":
            return httpx.Response(200, json={"items": [{"dispute_id": "PP-D-12345"}], "links": []})
        if request.method == "POST":
            writes.append(request)
            content = request.content.decode("latin1")
            assert "application/pdf" in content
            # Recover the exact hash marker from the multipart JSON input.
            import re
            marker = re.search(r"ShieldPay packet [a-f0-9]{64}", content).group(0)
            detail["evidences"] = [{"evidence_type": "PROOF_OF_FULFILLMENT", "source": "SUBMITTED_BY_SELLER", "notes": marker, "documents": [{"name": "shieldpay-evidence.pdf"}]}]
            return httpx.Response(200, json={"links": []})
        return httpx.Response(200, json=detail)
    with httpx.Client(transport=httpx.MockTransport(handle)) as transport, TestClient(app) as client:
        app.state.paypal = PayPal(settings, transport)
        headers = {"X-Admin-Token": "admin"}
        assert client.post("/api/paypal/sync", headers=headers).status_code == 200
        # Test-only imported merchant records; production has no import/upload endpoint.
        case = app.state.store.get_case("PP-D-12345", "sandbox")
        base = {k:v for k,v in case.items() if k not in {"sources", "audit", "analysis", "evidence_count"}}
        sources = [dict(id="test-order", type="order", title="Test-only order fixture", text="Order: TXN123\nTracking: TRACK123", order_id="TXN123", occurred_at=delivered_at),
                   dict(id="test-carrier", type="carrier", title="Test-only carrier fixture", text="Order: TXN123\nTracking: TRACK123\nDelivery status: DELIVERED\nDelivered at: " + delivered_at, order_id="TXN123", occurred_at=delivered_at)]
        # Change a metadata value so Store updates the fixture sources as part of this setup.
        base["summary"] = "TEST FIXTURE ONLY: not real merchant evidence"
        app.state.store.put_case(base, "sandbox", sources=sources)
        url = "/api/cases/PP-D-12345"
        analysis = client.post(url + "/analyze", headers=headers).json()
        assert analysis["can_submit"] is True
        approval = client.post(url + "/approve", headers=headers, json={"packet_hash": analysis["packet_hash"], "approved_by": "Reviewer"}).json()
        payload = {"packet_hash": analysis["packet_hash"], "approval_id": approval["approval_id"]}
        result = client.post(url + "/submit", headers=headers, json=payload)
        assert result.status_code == 200, result.text
        assert result.json()["status"] == "verified"
        assert result.json()["verified"] is True
        assert client.post(url + "/submit", headers=headers, json=payload).json() == result.json()
        assert len(writes) == 1
