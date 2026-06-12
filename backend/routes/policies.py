"""Engineer-managed access policies — which eggs/nodes are exposed to free vs premium users."""
from fastapi import APIRouter, HTTPException, Depends

from db import db
from models import EggPolicy, EggPolicyIn, NodePolicy, NodePolicyIn
from auth_utils import require_role

# Engineers + admin can manage policies
require_engineer = require_role("admin", "engineer")

router = APIRouter(prefix="/api/admin", tags=["policies"])


# ----------------- Egg Policies -----------------
@router.get("/egg-policies", dependencies=[Depends(require_engineer)])
async def list_egg_policies():
    docs = await db.egg_policies.find({}, {"_id": 0}).sort("sort_order", 1).to_list(500)
    return docs


@router.post("/egg-policies", dependencies=[Depends(require_engineer)])
async def create_egg_policy(payload: EggPolicyIn):
    existing = await db.egg_policies.find_one({"egg_id": payload.egg_id, "nest_id": payload.nest_id})
    if existing:
        raise HTTPException(status_code=400, detail="Policy for this nest+egg already exists")
    p = EggPolicy(**payload.model_dump())
    await db.egg_policies.insert_one(p.model_dump())
    return p.model_dump()


@router.put("/egg-policies/{policy_id}", dependencies=[Depends(require_engineer)])
async def update_egg_policy(policy_id: str, payload: EggPolicyIn):
    res = await db.egg_policies.update_one({"id": policy_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Policy not found")
    return {"ok": True}


@router.delete("/egg-policies/{policy_id}", dependencies=[Depends(require_engineer)])
async def delete_egg_policy(policy_id: str):
    await db.egg_policies.delete_one({"id": policy_id})
    return {"ok": True}


# ----------------- Node Policies -----------------
@router.get("/node-policies", dependencies=[Depends(require_engineer)])
async def list_node_policies():
    docs = await db.node_policies.find({}, {"_id": 0}).sort("sort_order", 1).to_list(500)
    return docs


@router.post("/node-policies", dependencies=[Depends(require_engineer)])
async def create_node_policy(payload: NodePolicyIn):
    existing = await db.node_policies.find_one({"node_id": payload.node_id})
    if existing:
        raise HTTPException(status_code=400, detail="Policy for this node already exists")
    p = NodePolicy(**payload.model_dump())
    await db.node_policies.insert_one(p.model_dump())
    return p.model_dump()


@router.put("/node-policies/{policy_id}", dependencies=[Depends(require_engineer)])
async def update_node_policy(policy_id: str, payload: NodePolicyIn):
    res = await db.node_policies.update_one({"id": policy_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Policy not found")
    return {"ok": True}


@router.delete("/node-policies/{policy_id}", dependencies=[Depends(require_engineer)])
async def delete_node_policy(policy_id: str):
    await db.node_policies.delete_one({"id": policy_id})
    return {"ok": True}
