"""Stripe webhook handler."""
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Request

from db import db
from emergentintegrations.payments.stripe.checkout import StripeCheckout

router = APIRouter(prefix="/api/webhook", tags=["webhook"])


@router.post("/stripe")
async def stripe_webhook(request: Request):
    api_key = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")
    host_url = str(request.base_url).rstrip("/")
    stripe = StripeCheckout(api_key=api_key, webhook_url=f"{host_url}/api/webhook/stripe")

    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        event = await stripe.handle_webhook(body, sig)
    except Exception:
        return {"received": False}

    if event and getattr(event, "session_id", None):
        txn = await db.payment_transactions.find_one({"session_id": event.session_id})
        if txn and txn.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {
                    "$set": {
                        "payment_status": event.payment_status,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )
            if event.payment_status == "paid" and txn.get("invoice_id"):
                await db.invoices.update_one(
                    {"id": txn["invoice_id"]},
                    {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}},
                )
    return {"received": True}
