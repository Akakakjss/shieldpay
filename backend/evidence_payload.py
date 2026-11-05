"""Pure, conservative PayPal evidence input construction from stored records."""
import hashlib
import unicodedata
from datetime import datetime
from backend.analysis import fields

# Supported subset of PayPal's enum; OTHER needs separately evidenced details.
CARRIERS = frozenset({"UPS", "USPS", "FEDEX", "AIRBORNE_EXPRESS", "DHL", "AIRSURE",
                      "ROYAL_MAIL", "PARCELFORCE", "SWIFTAIR", "UK_PARCELFORCE",
                      "UK_ROYALMAIL_SPECIAL"})
DOCUMENT_NAME = "shieldpay-evidence.pdf"


def build_evidence_payload(case, notes):
    """Return JSON input or raise ValueError; no mutation, clock, or network.

    Integrity checks establish stored-text consistency, not source authenticity.
    Caller separately enforces approval, current eligibility and deadlines.
    """
    if not isinstance(notes, str) or not 1 <= len(notes) <= 2000:
        raise ValueError("Evidence notes must contain 1 to 2000 characters")
    if not isinstance(case, dict) or not isinstance(case.get("order_id"), str) or not case["order_id"] or not isinstance(case.get("sources"), list):
        raise ValueError("Case must contain an exact order and source list")
    orders, carriers, declared_carriers = [], [], set()
    for source in case["sources"]:
        if not isinstance(source, dict):
            raise ValueError("Invalid source record")
        if source.get("order_id") != case["order_id"] or source.get("type") not in {"order", "carrier"}:
            continue
        text = source.get("text")
        if not isinstance(text, str) or hashlib.sha256(text.encode()).hexdigest() != source.get("sha256"):
            raise ValueError("Source integrity mismatch")
        # splitlines() would otherwise silently truncate a tracking field at
        # nonstandard line separators, potentially repairing an identifier.
        if any(c in text for c in "\v\f\x1c\x1d\x1e\x85\u2028\u2029"):
            raise ValueError("Unsupported line separator in tracking source")
        fact = fields(text)
        if fact.get("Order") != case["order_id"]:
            raise ValueError("Source lacks exact matching Order field")
        tracking = fact.get("Tracking")
        if (not isinstance(tracking, str) or not 1 <= len(tracking) <= 255 or not tracking.strip()
                or tracking != tracking.strip() or any(unicodedata.category(c).startswith("C") for c in tracking)):
            raise ValueError("Missing or invalid tracking number")
        if "Carrier" in fact:
            declared_carriers.add(fact["Carrier"])
        if source["type"] == "order":
            orders.append(tracking)
        else:
            name = fact.get("Carrier")
            if name not in CARRIERS:
                raise ValueError("Missing or unsupported exact Carrier field")
            if fact.get("Delivery status") != "DELIVERED":
                raise ValueError("Carrier record must report DELIVERED")
            try:
                delivered = datetime.fromisoformat(fact.get("Delivered at", "").replace("Z", "+00:00"))
                if delivered.utcoffset() is None:
                    raise ValueError()
            except ValueError as exc:
                raise ValueError("Carrier record needs a valid timezone-aware delivery timestamp") from exc
            carriers.append((tracking, name))
    if len(set(orders)) != 1 or len(set(carriers)) != 1 or not carriers or carriers[0][0] != orders[0] or declared_carriers != {carriers[0][1]}:
        raise ValueError("Missing, conflicting or ambiguous order/carrier tracking")
    tracking, carrier = carriers[0]
    return {"evidences": [{"evidence_type": "PROOF_OF_FULFILLMENT", "notes": notes,
                           "documents": [{"name": DOCUMENT_NAME}],
                           "evidence_info": {"tracking_info": [{"carrier_name": carrier,
                                                                "tracking_number": tracking}]}}]}
