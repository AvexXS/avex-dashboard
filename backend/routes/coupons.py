"""Coupons routes (admin CRUD + public validate)."""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends

from db import db
from models import Coupon, CouponIn, CouponValidateIn
from auth_utils import require_admin, get_current_user

router = APIRouter(prefix="/api", tags=["coupons"])


def _normalize_code(code: str) -> str:
    return code.strip().upper()


async def _resolve_discount(code: str, plan: dict) -> tuple[float, dict]:
    """Validate a coupon code against a plan. Returns (discounted_amount, coupon_doc)."""
    coupon = await db.coupons.find_one({"code": _normalize_code(code)}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid coupon code")
    if not coupon.get("active"):
        raise HTTPException(status_code=400, detail="Coupon inactive")

    expires_at = coupon.get("expires_at")
    if expires_at:
        try:
            ex = datetime.fromisoformat(expires_at)
            if ex.tzinfo is None:
                ex = ex.replace(tzinfo=timezone.utc)
            if ex < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Coupon expired")
        except ValueError:
            pass

    max_uses = coupon.get("max_uses", 0) or 0
    if max_uses and coupon.get("used_count", 0) >= max_uses:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")

    applies = coupon.get("applies_to_categories") or []
    if applies and plan.get("category") not in applies:
        raise HTTPException(status_code=400, detail="Coupon not valid for this plan")

    discount_pct = coupon.get("discount_percent", 0)
    new_amount = round(float(plan["price"]) * (100 - discount_pct) / 100, 2)
    if new_amount < 0.5:
        new_amount = 0.5  # Stripe minimum
    return new_amount, coupon


# ---------- Public ----------
@router.post("/coupons/validate")
async def validate_coupon(payload: CouponValidateIn, user=Depends(get_current_user)):
    plan = await db.plans.find_one({"id": payload.plan_id, "active": True}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    amount, coupon = await _resolve_discount(payload.code, plan)
    return {
        "valid": True,
        "code": coupon["code"],
        "discount_percent": coupon["discount_percent"],
        "original_amount": plan["price"],
        "discounted_amount": amount,
        "currency": plan.get("currency", "USD"),
    }


# ---------- Admin CRUD ----------
@router.get("/admin/coupons", dependencies=[Depends(require_admin)])
async def list_coupons():
    docs = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@router.post("/admin/coupons", dependencies=[Depends(require_admin)])
async def create_coupon(payload: CouponIn):
    code = _normalize_code(payload.code)
    if await db.coupons.find_one({"code": code}):
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    coupon = Coupon(**{**payload.model_dump(), "code": code})
    await db.coupons.insert_one(coupon.model_dump())
    return coupon.model_dump()


@router.put("/admin/coupons/{coupon_id}", dependencies=[Depends(require_admin)])
async def update_coupon(coupon_id: str, payload: CouponIn):
    data = payload.model_dump()
    data["code"] = _normalize_code(data["code"])
    res = await db.coupons.update_one({"id": coupon_id}, {"$set": data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"ok": True}


@router.delete("/admin/coupons/{coupon_id}", dependencies=[Depends(require_admin)])
async def delete_coupon(coupon_id: str):
    await db.coupons.delete_one({"id": coupon_id})
    return {"ok": True}
