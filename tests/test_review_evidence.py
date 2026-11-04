import hashlib
import json
import pytest

from fastapi.testclient import TestClient

from backend.app import create_app
from backend.config import Settings
from backend.paypal import PayPalError
from backend.sync import map_dispute


def test_multi_transaction_sync_is_atomic_and_rejected(tmp_path):
    settings = Settings(mode="sandbox", ai="lexical", db_path=str(tmp_path / "state.db"), admin_token="admin")
    app = create_app(settings)
    class StubPayPal:
        def close(self):
            pass
        def list_disputes(self):
            return ([{"dispute_id": "PP-D-12345", "disputed_transactions": [{"seller_transaction_id": "A"}, {"seller_transaction_id": "B"}]}], "fixture")
    with TestClient(app) as client:
        client.headers.update({"X-Admin-Token": "admin"})
        app.state.paypal = StubPayPal()
        response = client.post("/api/paypal/sync")
        assert response.status_code == 409
        assert client.get("/api/cases").json() == []


def test_multi_transaction_preflight_sends_no_evidence_write():
    import httpx
    from backend.paypal import PayPal
    calls = []
    dispute = {"dispute_id": "PP-D-12345", "status": "WAITING_FOR_SELLER_RESPONSE",
               "disputed_transactions": [{"seller_transaction_id": "A"}, {"seller_transaction_id": "B"}],
               "links": [{"rel": "provide-evidence", "method": "POST", "href": "https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-12345/provide-evidence"}]}
    def handle(request):
        calls.append(request.url.path)
        if request.url.path == "/v1/oauth2/token":
            return httpx.Response(200, json={"access_token": "fake", "expires_in": 3600})
        return httpx.Response(200, json=dispute)
    settings = Settings(mode="sandbox", paypal_client_id="fake", paypal_client_secret="fake")
    with httpx.Client(transport=httpx.MockTransport(handle)) as transport:
        with pytest.raises(PayPalError, match="(?i)multi.transaction"):
            PayPal(settings, transport).provide_evidence("PP-D-12345", b"%PDF-fake", "notes", "approval-1", expected_case={"order_id": "A", "reason": "UNKNOWN", "status": "WAITING_FOR_SELLER_RESPONSE", "amount": 0, "currency": "USD", "response_due": ""})
    assert not any(path.endswith("/provide-evidence") for path in calls)


def test_sandbox_summary_describes_available_manual_import():
    result = map_dispute({"dispute_id": "PP-D-12345"})
    assert "not built" not in result["summary"]
    assert "import" in result["summary"].lower()
    assert "unverified" in result["summary"].lower()


def test_multi_transaction_dispute_is_rejected_instead_of_dropping_extra_transaction():
    dispute = {"dispute_id": "PP-D-12345", "disputed_transactions": [
        {"seller_transaction_id": "FIRST"}, {"seller_transaction_id": "SECOND"}]}
    with pytest.raises(PayPalError, match="(?i)multi.transaction"):
        map_dispute(dispute)


def test_duplicate_tracking_cannot_match_the_ambiguous_sentinel(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "state.db"), ai="lexical"))
    with TestClient(app) as client:
        with app.state.store.connect() as db:
            for sid, tracking in [("1042-order", "Tracking: ONE\nTracking: TWO"),
                                  ("1042-carrier", "Tracking: AMBIGUOUS")]:
                source = json.loads(db.execute("SELECT data FROM sources WHERE id=?", (sid,)).fetchone()[0])
                lines = source["text"].splitlines()
                source["text"] = "\n".join(tracking if line.startswith("Tracking: ") else line for line in lines)
                source["sha256"] = hashlib.sha256(source["text"].encode()).hexdigest()
                db.execute("UPDATE sources SET data=? WHERE id=?", (json.dumps(source), sid))
        result = client.post("/api/cases/DEMO-1042/analyze").json()
        assert result["can_submit"] is False
        assert any("duplicate" in message.lower() for message in result["gaps"] + result["contradictions"])


def test_duplicate_buyer_issue_cannot_hide_contradiction(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "state.db"), ai="lexical"))
    with TestClient(app) as client:
        with app.state.store.connect() as db:
            sid = "1042-buyer_message"
            source = json.loads(db.execute("SELECT data FROM sources WHERE id=?", (sid,)).fetchone()[0])
            source["text"] = ("Order: ORDER-1042\nBuyer statement: I received the parcel.\n"
                              "Issue: NOT_RECEIVED\nIssue: OTHER")
            source["sha256"] = hashlib.sha256(source["text"].encode()).hexdigest()
            db.execute("UPDATE sources SET data=? WHERE id=?", (json.dumps(source), sid))
        result = client.post("/api/cases/DEMO-1042/analyze").json()
        assert result["can_submit"] is False
        assert any("duplicate" in message.lower() for message in result["gaps"] + result["contradictions"])
