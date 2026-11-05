import hashlib
import copy
import pytest


def source(kind, text, order="ORDER-1"):
    return {"id": kind, "type": kind, "order_id": order, "text": text,
            "sha256": hashlib.sha256(text.encode()).hexdigest()}


def example_case():
    return {"order_id": "ORDER-1", "sources": [
        source("order", "Order: ORDER-1\nTracking: ABC123"),
        source("carrier", "Order: ORDER-1\nTracking: ABC123\nCarrier: UPS\nDelivery status: DELIVERED\nDelivered at: 2024-01-01T00:00:00Z"),
    ]}


def test_payload_contains_exact_verified_tracking_and_document():
    from backend.evidence_payload import build_evidence_payload
    assert build_evidence_payload(example_case(), "packet") == {"evidences": [{
        "evidence_type": "PROOF_OF_FULFILLMENT", "notes": "packet",
        "documents": [{"name": "shieldpay-evidence.pdf"}],
        "evidence_info": {"tracking_info": [{"carrier_name": "UPS", "tracking_number": "ABC123"}]},
    }]}


@pytest.mark.parametrize("tracking", ["A\tB", "A\x00B", "A\x7fB", "A\x80B", "A\vB"])
def test_matching_tracking_with_control_characters_is_rejected(tracking):
    from backend.evidence_payload import build_evidence_payload
    case = example_case()
    for i, original in enumerate(case["sources"]):
        case["sources"][i] = source(original["type"], original["text"].replace("ABC123", tracking))
    with pytest.raises(ValueError, match="tracking"):
        build_evidence_payload(case, "packet")


@pytest.mark.parametrize("change", [
    "tamper", "duplicate_tracking", "duplicate_carrier", "mismatch", "foreign_text",
    "foreign_metadata", "missing_carrier", "unsupported_carrier", "not_delivered",
    "invalid_date", "second_tracking", "second_carrier", "too_long_tracking", "order_carrier_conflict",
])
def test_invalid_or_ambiguous_sources_are_rejected(change):
    from backend.evidence_payload import build_evidence_payload
    case = example_case()
    order, carrier = case["sources"]
    if change == "tamper":
        carrier["text"] += "x"
    elif change == "foreign_metadata":
        carrier["order_id"] = "OTHER"
    elif change == "order_carrier_conflict":
        case["sources"][0] = source("order", order["text"] + "\nCarrier: FEDEX")
    elif change == "second_tracking":
        case["sources"].append(source("order", "Order: ORDER-1\nTracking: OTHER"))
    elif change == "second_carrier":
        case["sources"].append(source("carrier", carrier["text"].replace("UPS", "FEDEX")))
    else:
        text = carrier["text"]
        replacements = {
            "duplicate_tracking": text + "\nTracking: ABC123",
            "duplicate_carrier": text + "\nCarrier: UPS",
            "mismatch": text.replace("ABC123", "XYZ"),
            "foreign_text": text.replace("Order: ORDER-1", "Order: OTHER"),
            "missing_carrier": text.replace("Carrier: UPS\n", ""),
            "unsupported_carrier": text.replace("Carrier: UPS", "Carrier: INVENTED"),
            "not_delivered": text.replace("DELIVERED", "IN_TRANSIT"),
            "invalid_date": text.replace("2024-01-01T00:00:00Z", "not-a-date"),
            "too_long_tracking": text.replace("ABC123", "A" * 256),
        }
        case["sources"][1] = source("carrier", replacements[change])
    before = copy.deepcopy(case)
    with pytest.raises(ValueError):
        build_evidence_payload(case, "packet")
    assert case == before
