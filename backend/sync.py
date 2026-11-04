import math
from backend.paypal import PayPalError


def map_dispute(dispute):
    transactions = dispute.get("disputed_transactions") or []
    if len(transactions) > 1:
        raise PayPalError("Multi-transaction disputes are unsupported; review in PayPal before analysis or submission", 409)
    transaction = transactions[0] if transactions and isinstance(transactions[0], dict) else {}
    buyer = transaction.get("buyer") or {}
    amount = dispute.get("dispute_amount") or {}
    try:
        value = float(amount.get("value", 0))
        if not math.isfinite(value) or value < 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise PayPalError("Sandbox dispute amount is invalid; import stopped")
    return dict(id=dispute["dispute_id"], order_id=transaction.get("seller_transaction_id") or "UNMAPPED-" + dispute["dispute_id"],
                buyer=buyer.get("name", "Sandbox buyer (name unavailable)") if isinstance(buyer, dict) else "Sandbox buyer",
                reason=dispute.get("reason", "UNKNOWN"), amount=value,
                currency=amount.get("currency_code", "USD"), status=dispute.get("status", "UNKNOWN"),
                response_due=dispute.get("seller_response_due_date") or "", risk="blocked",
                summary="SANDBOX IMPORT. Dispute metadata only; manually imported merchant evidence is unverified. No synthetic evidence is attached.")
