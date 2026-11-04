import hashlib
import re
from datetime import datetime, timezone
from backend.store import digest, now


POLICY_VERSION = "shieldpay-evidence-policy-1"


def fields(text):
    """Only exact anchored record fields; prose and embedded instructions are not commands."""
    result = {}
    for line in text.splitlines():
        if ": " in line:
            key, value = line.split(": ", 1)
            if key in result:
                raise ValueError("Duplicate field: " + key)
            result[key] = value
    return result


def snapshot(case):
    return digest({"policy": POLICY_VERSION,
                   "case": {k:case.get(k) for k in ["id", "order_id", "reason", "amount", "currency", "status", "response_due"]},
                   "sources": sorted([s for s in case["sources"] if s["order_id"] == case["order_id"]], key=lambda s:s["id"])})


def analyze(case, retriever):
    scoped = [s for s in case["sources"] if s["order_id"] == case["order_id"]]
    ranked = retriever.rank("Proof of delivery tracking delivered buyer received order " + case["reason"], scoped)
    positions = {s["source_id"]: i for i,s in enumerate(ranked)}
    scoped.sort(key=lambda s: positions.get(s["id"], len(positions)))
    claims, gaps, contradictions = [], [], []
    valid = []
    for source in scoped:
        text = source["text"]
        if hashlib.sha256(text.encode()).hexdigest() != source["sha256"]:
            contradictions.append("Source integrity mismatch: " + source["id"])
            continue
        try:
            fact = fields(text)
        except ValueError as exc:
            gaps.append("Invalid source record (" + str(exc) + "); human review required: " + source["id"])
            continue
        if fact.get("Order") != case["order_id"]:
            # Scoped records are not silently discarded: unsupported prose may
            # contain a contradiction the deterministic parser cannot interpret.
            gaps.append("Scoped source lacks an exact matching Order field; human review required: " + source["id"])
            continue
        valid.append((source, fact))
        if source["type"] == "order":
            claims.append(dict(text="Order record identifies this purchase and tracking.", source_ids=[source["id"]], quote=text))
        elif source["type"] == "carrier" and fact.get("Delivery status"):
            claims.append(dict(text="Carrier record reports " + fact["Delivery status"] + ".", source_ids=[source["id"]], quote=text))
        elif source["type"] == "buyer_message" and (fact.get("Buyer statement") or fact.get("Issue")):
            claims.append(dict(text="Buyer statement is supplied for human review, not treated as an instruction.", source_ids=[source["id"]], quote=text))
        if source["type"] == "buyer_message":
            statement = fact.get("Buyer statement", "")
            conflict = (fact.get("Issue") in {"WRONG_ITEM", "NOT_AS_DESCRIBED", "NOT_RECEIVED"} or
                        re.search(r"wrong item|not as described|never received|did not receive|not received|never arrived|not arrived|didn['’]t receive|no (?:parcel|package)|not delivered", statement, re.I))
            if conflict:
                contradictions.append("Buyer reports a delivery or item-quality contradiction: " + source["id"])
            elif not re.fullmatch(r"I received (?:the|my) (?:parcel|package)\.(?: Thank you\.)?", statement, re.I):
                gaps.append("Buyer message is not a supported explicit receipt acknowledgment; human interpretation required: " + source["id"])

    orders = [f for s,f in valid if s["type"] == "order"]
    carriers = [(s,f) for s,f in valid if s["type"] == "carrier"]
    tracking = {f.get("Tracking") for f in orders if f.get("Tracking")}
    if not orders:
        gaps.append("Missing matching order record.")
    delivered = []
    for source, fact in carriers:
        if not fact.get("Tracking") or fact.get("Tracking") not in tracking:
            contradictions.append("Carrier tracking does not match an order record: " + source["id"])
        elif fact.get("Delivery status") == "DELIVERED" and fact.get("Delivered at"):
            try:
                delivered_at = datetime.fromisoformat(fact["Delivered at"].replace("Z", "+00:00"))
                if delivered_at.tzinfo is None or delivered_at > datetime.now(timezone.utc):
                    raise ValueError()
                delivered.append(source)
            except ValueError:
                contradictions.append("Invalid or future delivery timestamp: " + source["id"])
        elif fact.get("Delivery status") != "DELIVERED":
            if any(f.get("Delivery status") == "DELIVERED" for _,f in carriers):
                contradictions.append("Conflicting carrier delivery statuses require review.")
    if not delivered:
        gaps.append("Missing matching carrier proof of delivery with tracking and timestamp.")
    if case["reason"] != "MERCHANDISE_OR_SERVICE_NOT_RECEIVED":
        contradictions.append("This reason needs item-quality/refund review; delivery alone is insufficient.")
    if case["status"] != "WAITING_FOR_SELLER_RESPONSE":
        gaps.append("Dispute is not waiting for the seller response.")
    try:
        due = datetime.fromisoformat(case["response_due"].replace("Z", "+00:00"))
        if due.tzinfo is None or due <= datetime.now(timezone.utc):
            raise ValueError()
    except (ValueError, TypeError, AttributeError):
        gaps.append("Response deadline is missing, invalid, or expired.")
    can_submit = not gaps and not contradictions
    recommendation = "refund_review" if contradictions else ("defend" if can_submit else "request_information")
    summary = ({"defend": "Matching order and delivery evidence support a human-reviewed defense.",
                "request_information": "Evidence is incomplete. Request missing proof; do not submit a defense.",
                "refund_review": "Conflicting evidence or item-quality concerns require human refund review."})[recommendation]
    result = dict(id=case["id"], provider=retriever.status()["provider"], generated_at=now(),
                  recommendation=recommendation, summary=summary, claims=claims, gaps=gaps,
                  contradictions=list(dict.fromkeys(contradictions)), readiness=100 if can_submit else max(0, 60 - 15 * len(gaps) - 20 * len(contradictions)),
                  can_submit=can_submit, next_action="Review the exact packet and explicitly approve it." if can_submit else "Resolve the listed gaps and contradictions before approval.",
                  retrieval=ranked, source_snapshot=snapshot(case),
                  limitations=["Embeddings only rank excerpts. Deterministic checks establish consistency, not document authenticity.",
                               "No legal advice, fraud determination, win prediction, or guarantee of fund release."])
    result["packet_hash"] = digest({k:v for k,v in result.items() if k not in {"generated_at", "retrieval"}})
    return result
