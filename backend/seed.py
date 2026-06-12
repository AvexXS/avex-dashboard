"""Seed initial data: ensure default plans + first-user-becomes-admin handled in auth route."""
import logging
from datetime import datetime, timezone

from db import db
from models import Plan

logger = logging.getLogger(__name__)


DEFAULT_PLANS = [
    # Hosting plans
    {
        "name": "Free Tier",
        "category": "hosting",
        "price": 0,
        "currency": "USD",
        "cycle": "monthly",
        "ram_gb": 2,
        "cpu_cores": 1,
        "storage_gb": 5,
        "features": ["1 Server", "2 GB RAM", "1 CPU Core", "5 GB Storage", "Basic Support"],
        "is_free": True,
        "sort_order": 1,
    },
    {
        "name": "Starter",
        "category": "hosting",
        "price": 4.99,
        "currency": "USD",
        "cycle": "monthly",
        "ram_gb": 4,
        "cpu_cores": 2,
        "storage_gb": 20,
        "features": ["3 Servers", "4 GB RAM", "2 CPU Cores", "20 GB SSD", "Priority Support"],
        "is_free": False,
        "sort_order": 2,
    },
    {
        "name": "Performance",
        "category": "hosting",
        "price": 12.99,
        "currency": "USD",
        "cycle": "monthly",
        "ram_gb": 8,
        "cpu_cores": 4,
        "storage_gb": 60,
        "features": ["10 Servers", "8 GB RAM", "4 CPU Cores", "60 GB NVMe", "DDoS Protection", "24/7 Support"],
        "is_free": False,
        "sort_order": 3,
    },
    {
        "name": "Enterprise",
        "category": "hosting",
        "price": 29.99,
        "currency": "USD",
        "cycle": "monthly",
        "ram_gb": 16,
        "cpu_cores": 8,
        "storage_gb": 200,
        "features": ["Unlimited Servers", "16 GB RAM", "8 CPU Cores", "200 GB NVMe", "Dedicated IP", "White-glove Support"],
        "is_free": False,
        "sort_order": 4,
    },
    # Design plans
    {
        "name": "Logo & Brand Identity",
        "category": "design",
        "price": 89.0,
        "currency": "USD",
        "cycle": "one_time",
        "features": ["Custom logo", "Brand color palette", "Typography system", "2 revisions"],
        "sort_order": 1,
    },
    {
        "name": "Landing Page Design",
        "category": "design",
        "price": 249.0,
        "currency": "USD",
        "cycle": "one_time",
        "features": ["Full landing page", "Mobile responsive", "Figma file", "3 revisions"],
        "sort_order": 2,
    },
    {
        "name": "Full Website Design",
        "category": "design",
        "price": 599.0,
        "currency": "USD",
        "cycle": "one_time",
        "features": ["Up to 8 pages", "Mobile responsive", "Figma file", "Unlimited revisions", "Dev handoff"],
        "sort_order": 3,
    },
    # Video editing plans
    {
        "name": "Short-Form Edit",
        "category": "video_editing",
        "price": 39.0,
        "currency": "USD",
        "cycle": "one_time",
        "features": ["Up to 60 sec", "Captions", "Music", "1 revision"],
        "sort_order": 1,
    },
    {
        "name": "Long-Form Edit",
        "category": "video_editing",
        "price": 129.0,
        "currency": "USD",
        "cycle": "one_time",
        "features": ["Up to 15 min", "Color grading", "SFX & Music", "3 revisions"],
        "sort_order": 2,
    },
    {
        "name": "Monthly Retainer",
        "category": "video_editing",
        "price": 499.0,
        "currency": "USD",
        "cycle": "monthly",
        "features": ["4 edits/month", "Priority queue", "Dedicated editor"],
        "sort_order": 3,
    },
]


async def seed_plans():
    existing = await db.plans.count_documents({})
    if existing == 0:
        for p in DEFAULT_PLANS:
            plan = Plan(**p)
            await db.plans.insert_one(plan.model_dump())
        logger.info("Seeded %d plans", len(DEFAULT_PLANS))


async def seed_settings():
    import os
    existing = await db.settings.find_one({"id": "platform_settings"})
    if not existing:
        await db.settings.insert_one(
            {
                "id": "platform_settings",
                "pterodactyl_url": None,
                "pterodactyl_api_key": None,
                "discord_client_id": None,
                "discord_client_secret": None,
                "google_client_id": None,
                "google_client_secret": None,
                "razorpay_key_id": None,
                "razorpay_key_secret": None,
                "paypal_client_id": None,
                "paypal_client_secret": None,
                "discord_invite_url": os.environ.get("DISCORD_INVITE_URL", "https://discord.gg/8Y4deMVsm4"),
                "enabled_payment_methods": ["stripe"],
            }
        )
        logger.info("Seeded platform settings")
