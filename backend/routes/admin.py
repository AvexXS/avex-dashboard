"""Admin routes."""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends

from db import db
from models import StaffCreateIn, UserRoleIn, PlatformSettings, PlatformSettingsIn, User
from auth_utils import require_admin, hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", dependencies=[Depends(require_admin)])
async def stats():
    return {
        "users": await db.users.count_documents({}),
        "active_servers": await db.servers.count_documents({"status": "online"}),
        "total_servers": await db.servers.count_documents({}),
        "open_tickets": await db.tickets.count_documents({"status": "open"}),
        "total_tickets": await db.tickets.count_documents({}),
        "paid_invoices": await db.invoices.count_documents({"status": "paid"}),
        "unpaid_invoices": await db.invoices.count_documents({"status": "unpaid"}),
        "total_revenue": sum(
            (doc.get("amount", 0) or 0)
            for doc in await db.invoices.find({"status": "paid"}, {"_id": 0, "amount": 1}).to_list(2000)
        ),
        "staff_count": await db.users.count_documents({"role": {"$in": ["admin", "staff", "engineer"]}}),
    }


@router.get("/users", dependencies=[Depends(require_admin)])
async def list_users():
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return docs


@router.patch("/users/{user_id}/role", dependencies=[Depends(require_admin)])
async def set_user_role(user_id: str, payload: UserRoleIn):
    await db.users.update_one({"id": user_id}, {"$set": {"role": payload.role}})
    return {"ok": True}


@router.delete("/users/{user_id}", dependencies=[Depends(require_admin)])
async def delete_user(user_id: str):
    await db.users.delete_one({"id": user_id})
    return {"ok": True}


@router.post("/users/staff", dependencies=[Depends(require_admin)])
async def create_staff(payload: StaffCreateIn):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(email=email, name=payload.name, role=payload.role, email_verified=True)
    doc = user.model_dump()
    doc["password_hash"] = hash_password(payload.password)
    await db.users.insert_one(doc)
    user_dict = user.model_dump()
    return user_dict


# Settings
@router.get("/settings", dependencies=[Depends(require_admin)])
async def get_settings():
    doc = await db.settings.find_one({"id": "platform_settings"}, {"_id": 0})
    if not doc:
        doc = PlatformSettings().model_dump()
        await db.settings.insert_one(doc)
    # Hide secrets — show only presence
    return {
        **doc,
        "pterodactyl_api_key_set": bool(doc.get("pterodactyl_api_key")),
        "discord_client_secret_set": bool(doc.get("discord_client_secret")),
        "google_client_secret_set": bool(doc.get("google_client_secret")),
        "razorpay_key_secret_set": bool(doc.get("razorpay_key_secret")),
        "paypal_client_secret_set": bool(doc.get("paypal_client_secret")),
    }


@router.put("/settings", dependencies=[Depends(require_admin)])
async def update_settings(payload: PlatformSettingsIn):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    await db.settings.update_one({"id": "platform_settings"}, {"$set": data}, upsert=True)
    return {"ok": True}


# Invoices (admin)
@router.get("/invoices", dependencies=[Depends(require_admin)])
async def all_invoices(status: str = ""):
    q = {}
    if status:
        q["status"] = status
    docs = await db.invoices.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@router.patch("/invoices/{invoice_id}/mark-paid", dependencies=[Depends(require_admin)])
async def mark_invoice_paid(invoice_id: str):
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat(), "payment_method": "manual"}},
    )
    return {"ok": True}


@router.get("/servers", dependencies=[Depends(require_admin)])
async def all_servers():
    docs = await db.servers.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs
