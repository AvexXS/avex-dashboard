"""Billing routes (Stripe checkout + invoices)."""
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Request

from db import db
from models import Invoice, CheckoutRequestIn, PaymentTransaction, Ticket, TicketMessage
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
    plan = await db.plans.find_one({"id": payload.plan_id, "active": True}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan.get("is_free"):
        raise HTTPException(status_code=400, detail="Cannot purchase a free plan")

    # Validate intent against plan category
    is_design = plan["category"] in ("design", "video_editing")
    if payload.intent == "design_order" and not is_design:
        raise HTTPException(status_code=400, detail="Design order requires a design/video_editing plan")

    amount = float(plan["price"])
    currency = plan.get("currency", "USD").lower()

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
            "intent": payload.intent,
        },
    )
    stripe = _stripe(request)
    session = await stripe.create_checkout_session(checkout_req)

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
        metadata={
            "plan_name": plan["name"],
            "plan_category": plan["category"],
            "intent": payload.intent,
            "details": payload.details or "",
            "subject": payload.subject or "",
        },
    )
    await db.payment_transactions.insert_one(txn.model_dump())
    await db.invoices.update_one({"id": invoice.id}, {"$set": {"session_id": session.session_id}})

    return {"url": session.url, "session_id": session.session_id, "invoice_id": invoice.id}


async def _maybe_create_design_ticket(txn: dict) -> str | None:
    """If transaction is a paid design_order and ticket not yet created, create the ticket."""
    meta = txn.get("metadata") or {}
    if meta.get("intent") != "design_order":
        return None
    if meta.get("ticket_id"):
        return meta["ticket_id"]

    user = await db.users.find_one({"id": txn["user_id"]}, {"_id": 0})
    if not user:
        return None

    plan = await db.plans.find_one({"id": txn.get("plan_id")}, {"_id": 0}) if txn.get("plan_id") else None
    category = "design"
    plan_name = meta.get("plan_name") or "Design Order"
    if plan:
        category = "video_editing" if plan["category"] == "video_editing" else "design"

    subject = meta.get("subject") or f"{plan_name} order"
    details = meta.get("details") or "(no brief provided)"
    body = (
        f"New {plan_name} order paid.\n\n"
        f"Invoice ID: {txn.get('invoice_id')}\n"
        f"Amount: {txn.get('currency')} {txn.get('amount')}\n\n"
        f"Brief from customer:\n{details}"
    )

    ticket = Ticket(
        user_id=user["id"],
        user_email=user["email"],
        user_name=user.get("name", "Customer"),
        subject=subject,
        category=category,
        plan_id=txn.get("plan_id"),
        priority="normal",
    )
    await db.tickets.insert_one(ticket.model_dump())

    msg = TicketMessage(
        ticket_id=ticket.id,
        author_id=user["id"],
        author_name=user.get("name", "Customer"),
        author_role=user.get("role", "user"),
        body=body,
    )
    await db.ticket_messages.insert_one(msg.model_dump())

    meta["ticket_id"] = ticket.id
    await db.payment_transactions.update_one(
        {"session_id": txn["session_id"]}, {"$set": {"metadata": meta}}
    )
    return ticket.id


@router.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request, user=Depends(get_current_user)):
    stripe = _stripe(request)
    status = await stripe.get_checkout_status(session_id)

    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    ticket_id = (txn.get("metadata") or {}).get("ticket_id")

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
            # Re-fetch and create ticket if design order
            fresh = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            ticket_id = await _maybe_create_design_ticket(fresh)

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "ticket_id": ticket_id,
        "intent": (txn.get("metadata") or {}).get("intent", "plan_upgrade"),
    }
