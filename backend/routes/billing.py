"""Billing routes (Stripe checkout + invoices)."""
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Request

from db import db
from models import Invoice, CheckoutRequestIn, PaymentTransaction
from auth_utils import get_current_user

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest,
)

router = APIRouter(prefix="/api/billing", tags=["billing"])


def _stripe(request: Request) -> StripeCheckout:
    api_key = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)


def _gen_invoice_number() -> str:
    return "INV-" + datetime.now(timezone.utc).strftime("%Y%m%d") + "-" + uuid.uuid4().hex[:6].upper()


@router.get("/invoices")
async def list_invoices(user=Depends(get_current_user)):
    docs = await db.invoices.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user=Depends(get_current_user)):
    doc = await db.invoices.find_one({"id": invoice_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return doc


@router.post("/checkout")
async def checkout(payload: CheckoutRequestIn, request: Request, user=Depends(get_current_user)):
    # Fetch plan from DB — never trust amount from frontend
    plan = await db.plans.find_one({"id": payload.plan_id, "active": True}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan.get("is_free"):
        raise HTTPException(status_code=400, detail="Cannot purchase a free plan")

    amount = float(plan["price"])
    currency = plan.get("currency", "USD").lower()

    # Create pending invoice
    invoice = Invoice(
        invoice_number=_gen_invoice_number(),
        user_id=user["id"],
        user_email=user["email"],
        plan_id=plan["id"],
        description=f"{plan['name']} — {plan['category'].replace('_', ' ').title()}",
        amount=amount,
        currency=plan.get("currency", "USD"),
        status="unpaid",
        payment_method="stripe",
    )
    await db.invoices.insert_one(invoice.model_dump())

    success_url = f"{payload.origin_url}/dashboard/billing?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{payload.origin_url}/dashboard/billing?canceled=1"

    checkout_req = CheckoutSessionRequest(
        amount=amount,
        currency=currency,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["id"],
            "plan_id": plan["id"],
            "invoice_id": invoice.id,
        },
    )
    stripe = _stripe(request)
    session = await stripe.create_checkout_session(checkout_req)

    # Create payment transaction record
    txn = PaymentTransaction(
        session_id=session.session_id,
        user_id=user["id"],
        user_email=user["email"],
        plan_id=plan["id"],
        invoice_id=invoice.id,
        amount=amount,
        currency=plan.get("currency", "USD"),
        status="initiated",
        payment_status="pending",
        metadata={"plan_name": plan["name"]},
    )
    await db.payment_transactions.insert_one(txn.model_dump())
    await db.invoices.update_one({"id": invoice.id}, {"$set": {"session_id": session.session_id}})

    return {"url": session.url, "session_id": session.session_id, "invoice_id": invoice.id}


@router.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request, user=Depends(get_current_user)):
    stripe = _stripe(request)
    status = await stripe.get_checkout_status(session_id)

    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Only update if not already finalized to prevent double-processing
    if txn["payment_status"] != "paid":
        update = {
            "status": status.status,
            "payment_status": status.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})

        if status.payment_status == "paid":
            await db.invoices.update_one(
                {"id": txn["invoice_id"]},
                {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}},
            )

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
    }
