import hashlib
import json
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
import httpx
import pytest
from fastapi.testclient import TestClient
from backend.app import create_app
from backend.config import Settings
from backend.paypal import PayPal, PayPalError


def test_concurrent_submissions_and_distinct_approvers_only_emit_one_receipt(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "state.db"), ai="lexical"))
    with TestClient(app) as client:
        url = "/api/cases/DEMO-1042"
        analysis = client.post(url + "/analyze").json()
        approvals = [client.post(url + "/approve", json={"packet_hash": analysis["packet_hash"], "approved_by": name}).json() for name in ["Alex", "Sam"]]
        payloads = [{"approval_id": a["approval_id"], "packet_hash": analysis["packet_hash"]} for a in approvals]
        with ThreadPoolExecutor(max_workers=2) as pool:
            responses = list(pool.map(lambda p: client.post(url + "/submit", json=p), payloads))
        assert all(r.status_code in {200, 409} for r in responses)
        completed = [r.json() for r in responses if r.status_code == 200]
        assert completed
        assert len({x["receipt"] for x in completed}) == 1
        results = [client.post(url + "/submit", json=p).json() for p in payloads]
        assert results[0] == results[1]
        assert sum(x["action"] == "simulated_submission" for x in client.get(url).json()["audit"]) == 1


def test_expired_approval_is_rejected_even_if_packet_was_previously_safe(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "state.db"), ai="lexical"))
    with TestClient(app) as client:
        url = "/api/cases/DEMO-1042"
        analysis = client.post(url + "/analyze").json()
        approval = client.post(url + "/approve", json={"packet_hash": analysis["packet_hash"], "approved_by": "Alex"}).json()
        with app.state.store.connect() as db:
            case = json.loads(db.execute("SELECT data FROM cases WHERE id='DEMO-1042'").fetchone()[0])
            case["response_due"] = (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()
            db.execute("UPDATE cases SET data=? WHERE id=?", (json.dumps(case), case["id"]))
        assert client.post(url + "/submit", json={"approval_id": approval["approval_id"], "packet_hash": analysis["packet_hash"]}).status_code == 409
        assert client.post(url + "/analyze").json()["can_submit"] is False


@pytest.mark.parametrize("dispute_id", ["DEMO-1042", "PP-D-12345/evil", " PP-D-12345", "PP-D-12345?live=true", ""])
def test_malformed_or_synthetic_ids_never_make_any_network_call(dispute_id):
    calls = []
    def handle(request):
        calls.append(request)
        return httpx.Response(500)
    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        paypal = PayPal(Settings(mode="sandbox", paypal_client_id="fake", paypal_client_secret="fake"), client)
        with pytest.raises(PayPalError):
            paypal.provide_evidence(dispute_id, b"%PDF-test", "notes", "approval")
    assert calls == []


def test_notes_over_limit_rejected_before_oauth_or_network():
    with httpx.Client(transport=httpx.MockTransport(lambda req: pytest.fail("Network must not be called"))) as client:
        paypal = PayPal(Settings(mode="sandbox", paypal_client_id="fake", paypal_client_secret="fake"), client)
        with pytest.raises(PayPalError, match="2000"):
            paypal.provide_evidence("PP-D-12345", b"%PDF-test", "a" * 2001, "approval")


def test_preflight_failure_is_audited_as_blocked_not_left_in_flight(tmp_path):
    from backend.actions import submit
    app = create_app(Settings(db_path=str(tmp_path / "state.db"), ai="lexical"))
    with TestClient(app) as client:
        analysis = client.post("/api/cases/DEMO-1042/analyze").json()
        approval = client.post("/api/cases/DEMO-1042/approve", json={"packet_hash": analysis["packet_hash"], "approved_by": "Alex"}).json()
        # Move the test-only fixture into sandbox scope to exercise the gate's
        # callback error path without introducing any real evidence or network.
        with app.state.store.connect() as db:
            db.execute("UPDATE cases SET mode='sandbox' WHERE id='DEMO-1042'")
        def preflight(case, approval_id):
            raise PayPalError("No provide-evidence link; no evidence write was sent", 409)
        with pytest.raises(PayPalError):
            submit(app.state.store, "sandbox", "DEMO-1042", approval["approval_id"], analysis["packet_hash"], preflight)
        with app.state.store.connect() as db:
            assert db.execute("SELECT status FROM approvals WHERE id=?", (approval["approval_id"],)).fetchone()[0] == "blocked"
        assert any(a["action"] == "submission_blocked" for a in app.state.store.audit("DEMO-1042"))


def test_remote_case_change_blocks_previously_approved_packet_before_write():
    calls = []
    def handle(request):
        calls.append(request.method + " " + request.url.path)
        if request.url.path == "/v1/oauth2/token":
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        return httpx.Response(200, json={"dispute_id": "PP-D-12345", "status": "WAITING_FOR_SELLER_RESPONSE", "reason": "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED", "links": [{"rel": "provide-evidence", "method": "POST", "href": "https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-12345/provide-evidence"}]})
    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        paypal = PayPal(Settings(mode="sandbox", paypal_client_id="fake", paypal_client_secret="fake"), client)
        import inspect
        assert "expected_case" in inspect.signature(paypal.provide_evidence).parameters, "Remote case freshness is not checked"
        with pytest.raises(PayPalError, match="changed"):
            paypal.provide_evidence("PP-D-12345", b"%PDF-test", "notes", "approval", expected_case={"reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", "status": "WAITING_FOR_SELLER_RESPONSE", "amount": 12, "currency": "USD", "response_due": "", "order_id": "TXN123"})
    assert sum(c.startswith("POST /v1/customer") for c in calls) == 0
