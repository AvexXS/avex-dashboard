"""Public settings (Discord URL, enabled payment methods, etc.) accessible to all users."""
import os

from fastapi import APIRouter

from db import db

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/settings")
async def public_settings():
    doc = await db.settings.find_one({"id": "platform_settings"}, {"_id": 0}) or {}
    return {
        "discord_invite_url": doc.get("discord_invite_url") or os.environ.get("DISCORD_INVITE_URL", "https://discord.gg/8Y4deMVsm4"),
        "enabled_payment_methods": doc.get("enabled_payment_methods", ["stripe"]),
        "discord_oauth_enabled": bool(doc.get("discord_client_id")),
        "google_oauth_enabled": bool(doc.get("google_client_id")),
    }
