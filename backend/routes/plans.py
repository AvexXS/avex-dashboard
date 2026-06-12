"""Plans routes (public + admin)."""
from fastapi import APIRouter, HTTPException, Depends

from db import db
from models import Plan, PlanIn
from auth_utils import require_admin

router = APIRouter(prefix="/api/plans", tags=["plans"])


@router.get("")
async def list_plans(category: str = ""):
    q = {"active": True}
    if category:
        q["category"] = category
    docs = await db.plans.find(q, {"_id": 0}).sort("sort_order", 1).to_list(200)
    return docs


@router.get("/{plan_id}")
async def get_plan(plan_id: str):
    doc = await db.plans.find_one({"id": plan_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    return doc


# Admin
@router.post("/admin", dependencies=[Depends(require_admin)])
async def create_plan(payload: PlanIn):
    plan = Plan(**payload.model_dump())
    await db.plans.insert_one(plan.model_dump())
    return plan.model_dump()


@router.put("/admin/{plan_id}", dependencies=[Depends(require_admin)])
async def update_plan(plan_id: str, payload: PlanIn):
    res = await db.plans.update_one({"id": plan_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"ok": True}


@router.delete("/admin/{plan_id}", dependencies=[Depends(require_admin)])
async def delete_plan(plan_id: str):
    await db.plans.delete_one({"id": plan_id})
    return {"ok": True}


@router.get("/admin/all", dependencies=[Depends(require_admin)])
async def list_all_plans():
    docs = await db.plans.find({}, {"_id": 0}).sort("sort_order", 1).to_list(500)
    return docs
