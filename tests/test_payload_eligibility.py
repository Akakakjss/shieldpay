import hashlib
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from backend.actions import check_current
from backend.analysis import analyze
from backend.retrieval import Retriever


def make_case(carrier: str | None = "UPS"):
    def source(kind, text):
        return {"id": kind, "type": kind, "order_id": "ORDER-1", "text": text,
                "sha256": hashlib.sha256(text.encode()).hexdigest()}
    carrier_field = f"Carrier: {carrier}\n" if carrier is not None else ""
    return {"id": "case-1", "order_id": "ORDER-1", "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
            "amount": 10, "currency": "USD", "status": "WAITING_FOR_SELLER_RESPONSE",
            "response_due": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            "sources": [source("order", "Order: ORDER-1\nTracking: ABC123"),
                        source("carrier", "Order: ORDER-1\nTracking: ABC123\n" + carrier_field +
                               "Delivery status: DELIVERED\nDelivered at: 2024-01-01T00:00:00Z")]}


def test_analysis_blocks_missing_carrier_with_payload_gap():
    result = analyze(make_case(None), Retriever("lexical"))
    assert result["can_submit"] is False
    assert any("Carrier" in gap for gap in result["gaps"])


def test_legacy_ready_analysis_cannot_bypass_approval_recheck():
    case = make_case(None)
    case["analysis"] = analyze(case, Retriever("lexical"))
    case["analysis"]["can_submit"] = True  # Simulate a formerly eligible persisted analysis.
    with pytest.raises(HTTPException) as exc:
        check_current(case, case["analysis"]["packet_hash"], require_defense=True)
    assert exc.value.status_code == 409


@pytest.mark.parametrize("carrier", ["INVENTED", "ups", " UPS"])
def test_analysis_rejects_unsupported_exact_carrier(carrier):
    result = analyze(make_case(carrier), Retriever("lexical"))
    assert result["can_submit"] is False
    assert any("Carrier" in gap for gap in result["gaps"])


def test_valid_structured_evidence_remains_eligible():
    assert analyze(make_case(), Retriever("lexical"))["can_submit"] is True
