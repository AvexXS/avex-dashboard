"""Tickets routes (user + staff)."""
import os
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Request

from db import db
from models import Ticket, TicketCreateIn, TicketMessage, TicketReplyIn, TicketStatusIn
from auth_utils import get_current_user, require_staff
from email_service import send_ticket_notification

router = APIRouter(prefix="/api/tickets", tags=["tickets"])
logger = logging.getLogger(__name__)


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat()


def _frontend(request: Request) -> str:
    origin = request.headers.get("origin") or request.headers.get("referer")
    if origin:
        from urllib.parse import urlparse
        u = urlparse(origin)
        return f"{u.scheme}://{u.netloc}"
    return ""


@router.get("")
async def list_tickets(user=Depends(get_current_user)):
    docs = await db.tickets.find({"user_id": user["id"]}, {"_id": 0}).sort("last_reply_at", -1).to_list(200)
    return docs


@router.post("")
async def create_ticket(payload: TicketCreateIn, user=Depends(get_current_user)):
    ticket = Ticket(
        user_id=user["id"],
        user_email=user["email"],
        user_name=user.get("name", "User"),
        subject=payload.subject,
        category=payload.category,
        plan_id=payload.plan_id,
        priority=payload.priority,
    )
    await db.tickets.insert_one(ticket.model_dump())

    msg = TicketMessage(
        ticket_id=ticket.id,
        author_id=user["id"],
        author_name=user.get("name", "User"),
        author_role=user.get("role", "user"),
        body=payload.message,
    )
    await db.ticket_messages.insert_one(msg.model_dump())
    return ticket.model_dump()


@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str, user=Depends(get_current_user)):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    # Only owner or staff/admin/engineer can view
    if ticket["user_id"] != user["id"] and user.get("role") not in ("admin", "staff", "engineer"):
        raise HTTPException(status_code=403, detail="Forbidden")
    messages = await db.ticket_messages.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"ticket": ticket, "messages": messages}


@router.post("/{ticket_id}/reply")
async def reply_ticket(ticket_id: str, payload: TicketReplyIn, request: Request, user=Depends(get_current_user)):
    ticket = await db.tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket["user_id"] != user["id"] and user.get("role") not in ("admin", "staff", "engineer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    msg = TicketMessage(
        ticket_id=ticket_id,
        author_id=user["id"],
        author_name=user.get("name", "User"),
        author_role=user.get("role", "user"),
        body=payload.body,
    )
    await db.ticket_messages.insert_one(msg.model_dump())
    await db.tickets.update_one({"id": ticket_id}, {"$set": {"last_reply_at": _ts()}})

    # Notify counterparty
    if user.get("role") in ("admin", "staff", "engineer"):
        # Staff replied → notify user
        try:
            await send_ticket_notification(
                ticket["user_email"], ticket["user_name"], ticket_id, ticket["subject"],
                f"{_frontend(request)}/dashboard/tickets/{ticket_id}",
            )
        except Exception:
            logger.exception("Failed to notify user of staff reply")
    return msg.model_dump()


# --- Staff/Admin endpoints ---
@router.get("/admin/all")
async def list_all_tickets(category: str = "", status: str = "", user=Depends(require_staff)):
    q = {}
    if category:
        q["category"] = category
    if status:
        q["status"] = status
    docs = await db.tickets.find(q, {"_id": 0}).sort("last_reply_at", -1).to_list(500)
    return docs


@router.patch("/{ticket_id}/status")
async def update_status(ticket_id: str, payload: TicketStatusIn, user=Depends(require_staff)):
    await db.tickets.update_one({"id": ticket_id}, {"$set": {"status": payload.status, "last_reply_at": _ts()}})
    return {"ok": True}


@router.patch("/{ticket_id}/assign")
async def assign_ticket(ticket_id: str, assignee_id: str, user=Depends(require_staff)):
    await db.tickets.update_one({"id": ticket_id}, {"$set": {"assignee_id": assignee_id}})
    return {"ok": True}
