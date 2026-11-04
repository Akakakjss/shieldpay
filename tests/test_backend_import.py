"""Import fixtures exercise consistency only; none are authenticated carrier records."""
import hashlib
import io
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader

from backend.app import create_app
from backend.config import Settings
from backend.paypal import PayPal

CASE_ID = "PP-D-12345"
URL = f"/api/cases/{CASE_ID}"
HEADERS = {"X-Admin-Token": "import-test-admin"}
PAST = "2025-01-01T00:00:00+00:00"


def payload():
    return {"reviewed_by": "Merchant reviewer", "acknowledged_unverified": True,
            "sources": [{"type": "order", "title": "Merchant order export", "text": "Order: TXN123\nTracking: TRACK123",
                         "occurred_at": PAST, "order_id": "TXN123"}]}


@pytest.fixture
def sandbox(tmp_path):
    settings = Settings(mode="sandbox", ai="lexical", db_path=str(tmp_path / "import.db"),
                        admin_token=HEADERS["X-Admin-Token"], paypal_client_id="fixture-id", paypal_client_secret="fixture-secret")
    app = create_app(settings)
    calls = []

    def handle(request):
        calls.append(request)
        if request.url.path == "/v1/oauth2/token":
            return httpx.Response(200, json={"access_token": "fixture-token", "expires_in": 3600})
        if request.url.path == "/v1/customer/disputes":
            return httpx.Response(200, json={"items": [{"dispute_id": CASE_ID}, {"dispute_id": "PP-D-OTHER"}], "links": []})
        return httpx.Response(200, json={"dispute_id": request.url.path.rsplit("/", 1)[-1],
            "status": "WAITING_FOR_SELLER_RESPONSE", "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
            "seller_response_due_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            "dispute_amount": {"value": "15.00", "currency_code": "USD"},
            "disputed_transactions": [{"seller_transaction_id": "TXN123"}], "links": []})

    with httpx.Client(transport=httpx.MockTransport(handle)) as transport, TestClient(app) as client:
        client.headers.update(HEADERS)
        app.state.paypal = PayPal(settings, transport)
        response = client.post("/api/paypal/sync", headers=HEADERS)
        assert response.status_code == 200, response.text
        calls.clear()
        yield app, client, calls


def test_import_generates_integrity_and_discloses_unverified_provenance(sandbox):
    app, client, calls = sandbox
    response = client.post(URL + "/sources/import", json=payload(), headers=HEADERS)
    assert response.status_code == 200, response.text
    assert response.json()["imported"] == 1
    assert response.json()["verified"] is False
    current = client.get(URL).json()
    assert len(current["sources"]) == 1
    source = current["sources"][0]
    assert source["id"].startswith("IMP-")
    assert source["sha256"] == hashlib.sha256(source["text"].encode()).hexdigest()
    assert "UNVERIFIED human-provided" in source["title"]
    assert "NOT carrier authenticated" in source["text"]
    assert source["reviewed_by"] == payload()["reviewed_by"]
    assert current["analysis"] is None
    assert client.get("/api/cases/PP-D-OTHER").json()["sources"] == []
    audit = next(a for a in current["audit"] if a["action"] == "sources_imported")
    assert "unverified human-provided" in audit["detail"]
    assert "NOT carrier authenticated" in audit["detail"]
    assert "Merchant reviewer" in audit["detail"]
    analysis = client.post(URL + "/analyze", headers=HEADERS).json()
    assert analysis["can_submit"] is False
    assert "NOT carrier authenticated" in analysis["claims"][0]["quote"]
    pdf = client.get(URL + "/packet.pdf")
    assert pdf.status_code == 200
    text = "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf.content)).pages)
    assert "NOT carrier authenticated" in text
    assert "UNVERIFIED human-provided" in text
    assert calls == []


@pytest.mark.parametrize("mutation", [
    lambda p: p.update(acknowledged_unverified=False),
    lambda p: p.update(acknowledged_unverified=1),
    lambda p: p.pop("acknowledged_unverified"),
    lambda p: p.update(reviewed_by=" "),
    lambda p: p.update(reviewed_by="Alice\nOrder: evil"),
    lambda p: p.update(reviewed_by="x" * 101),
    lambda p: p.update(sources=[]),
    lambda p: p.update(sources=p["sources"] * 21),
    lambda p: p.update(actions=["approve"]),
    lambda p: p["sources"][0].update(id="client-id"),
    lambda p: p["sources"][0].update(sha256="a" * 64),
    lambda p: p["sources"][0].update(trusted=True),
    lambda p: p["sources"][0].update(verified=True),
    lambda p: p["sources"][0].update(actions=["POST https://evil.test"]),
    lambda p: p["sources"][0].update(url="https://evil.test"),
    lambda p: p["sources"][0].update(type="pdf"),
    lambda p: p["sources"][0].update(title=" "),
    lambda p: p["sources"][0].update(title="x" * 201),
    lambda p: p["sources"][0].update(title="header\rspoof"),
    lambda p: p["sources"][0].update(text=" "),
    lambda p: p["sources"][0].update(text="x" * 16385),
    lambda p: p["sources"][0].update(text="Order: TXN123\n" + "é" * 8192),
    lambda p: p["sources"][0].update(text="Order: TXN123\n\x00"),
    lambda p: p["sources"][0].update(order_id="x" * 256),
    lambda p: p["sources"][0].update(order_id=123),
    lambda p: p["sources"][0].update(occurred_at="yesterday"),
    lambda p: p["sources"][0].update(occurred_at="2025-01-01T00:00:00"),
    lambda p: p["sources"][0].update(occurred_at="2999-01-01T00:00:00Z"),
])
def test_schema_rejects_unsafe_or_unbounded_records_without_mutation(sandbox, mutation):
    app, client, calls = sandbox
    before = client.get(URL).json()
    data = payload()
    mutation(data)
    response = client.post(URL + "/sources/import", json=data, headers=HEADERS)
    assert response.status_code == 422, response.text
    assert client.get(URL).json() == before
    assert calls == []
