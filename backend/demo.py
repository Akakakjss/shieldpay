from datetime import datetime, timedelta, timezone


def seed(store):
    if store.list_cases("demo"):
        return
    today = datetime.now(timezone.utc)
    for suffix, reason, risk, status, summary in [
        ("1042", "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", "ready", "DELIVERED", "Matching carrier delivery and buyer receipt available."),
        ("1043", "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", "review", "IN_TRANSIT", "Shipment still in transit; no proof of delivery."),
        ("1044", "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED", "blocked", "DELIVERED", "Buyer reports a wrong item; delivery alone cannot resolve quality."),
    ]:
        order = "ORDER-" + suffix
        timestamp = (today - timedelta(days=2)).isoformat()
        tracking = "SYNTH-TRACK-" + suffix
        base = dict(id="DEMO-" + suffix, order_id=order, buyer="Synthetic Buyer " + suffix,
                    reason=reason, amount=129.0, currency="USD", status="WAITING_FOR_SELLER_RESPONSE",
                    response_due=(today + timedelta(days=5)).isoformat(), risk=risk,
                    summary="SYNTHETIC DEMO. " + summary)
        def src(kind, text, name):
            return dict(id=suffix + "-" + kind, type=kind, title="Synthetic " + name,
                        text=text, occurred_at=timestamp, order_id=order)
        sources = [src("order", f"Order: {order}\nTracking: {tracking}\nItem: Canvas field bag\nAmount: USD 129.00", "order record"),
                   src("carrier", f"Order: {order}\nTracking: {tracking}\nDelivery status: {status}\n" + (f"Delivered at: {timestamp}" if status == "DELIVERED" else "Proof of delivery: MISSING"), "carrier record")]
        if suffix == "1042":
            sources.append(src("buyer_message", "Order: " + order + "\nBuyer statement: I received the parcel. Thank you.", "buyer email"))
        if suffix == "1044":
            sources.append(src("buyer_message", "Order: " + order + "\nIssue: WRONG_ITEM\nBuyer statement: The parcel arrived but the wrong item was inside.", "buyer report"))
        sources.append(dict(id=suffix + "-unrelated", type="carrier", title="Synthetic unrelated order (excluded)",
                            text="Order: ORDER-9999\nTracking: OTHER-9999\nDelivery status: DELIVERED\nDelivered at: " + timestamp,
                            occurred_at=timestamp, order_id="ORDER-9999"))
        store.put_case(base, sources=sources)
        store.record(base["id"], "demo_seeded", "Explicitly synthetic example; not a real PayPal dispute.")
