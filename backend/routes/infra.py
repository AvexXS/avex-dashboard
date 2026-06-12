"""Infrastructure routes — proxies Pterodactyl Application API for nests, eggs, nodes."""
from fastapi import APIRouter, HTTPException, Depends

from auth_utils import require_admin, get_current_user
from db import db
import pterodactyl_client as ptero

router = APIRouter(prefix="/api", tags=["infra"])


@router.get("/pterodactyl/status")
async def pterodactyl_status(user=Depends(get_current_user)):
    """Tell the frontend whether Pterodactyl is configured + reachable."""
    doc = await db.settings.find_one({"id": "platform_settings"}, {"_id": 0}) or {}
    configured = bool(doc.get("pterodactyl_url") and doc.get("pterodactyl_api_key"))
    if not configured:
        return {"configured": False, "client_key_set": bool(doc.get("pterodactyl_client_key")), "reachable": False}
    try:
        await ptero.list_nodes()
        return {"configured": True, "client_key_set": bool(doc.get("pterodactyl_client_key")), "reachable": True, "url": doc.get("pterodactyl_url")}
    except Exception as e:
        return {"configured": True, "client_key_set": bool(doc.get("pterodactyl_client_key")), "reachable": False, "error": str(e)[:200]}


@router.get("/nests")
async def list_nests(user=Depends(get_current_user)):
    """List nests with their eggs — used at server creation.
    For non-staff users, filter by EggPolicy + user tier if any policies are configured."""
    data = await ptero.list_nests()
    is_staff = user.get("role") in ("admin", "staff", "engineer")
    tier = user.get("tier", "free")

    policies = []
    if not is_staff:
        policies = await db.egg_policies.find({"active": True}, {"_id": 0}).to_list(500)

    allowed_eggs: dict[int, dict] = {}
    if policies:
        for p in policies:
            if tier in (p.get("allowed_tiers") or []):
                allowed_eggs[p["egg_id"]] = p

    nests = []
    for n in (data.get("data") or []):
        attrs = n.get("attributes") or {}
        eggs_arr = ((attrs.get("relationships") or {}).get("eggs") or {}).get("data") or []
        eggs_out = []
        for e in eggs_arr:
            ea = e.get("attributes") or {}
            egg_id = ea.get("id")
            if not is_staff and policies and egg_id not in allowed_eggs:
                continue
            policy = allowed_eggs.get(egg_id) if policies else None
            eggs_out.append({
                "id": egg_id,
                "name": (policy or {}).get("display_name") or ea.get("name"),
                "description": (policy or {}).get("description") or ea.get("description"),
                "docker_image": ea.get("docker_image"),
                "icon": (policy or {}).get("icon"),
                "default_ram_mb": (policy or {}).get("default_ram_mb", 2048),
                "default_cpu_pct": (policy or {}).get("default_cpu_pct", 100),
                "default_disk_mb": (policy or {}).get("default_disk_mb", 5120),
            })
        if eggs_out or is_staff:
            nests.append({
                "id": attrs.get("id"),
                "name": attrs.get("name"),
                "description": attrs.get("description"),
                "eggs": eggs_out,
            })
    return nests


@router.get("/nests/{nest_id}/eggs")
async def list_eggs(nest_id: int, user=Depends(get_current_user)):
    data = await ptero.list_eggs(int(nest_id))
    eggs = []
    for e in (data.get("data") or []):
        a = e.get("attributes") or {}
        eggs.append({
            "id": a.get("id"),
            "name": a.get("name"),
            "description": a.get("description"),
            "docker_image": a.get("docker_image"),
            "docker_images": a.get("docker_images"),
            "startup": a.get("startup"),
            "config": a.get("config"),
            "script": a.get("script"),
        })
    return eggs


@router.get("/nodes")
async def list_nodes_public(user=Depends(get_current_user)):
    data = await ptero.list_nodes()
    is_staff = user.get("role") in ("admin", "staff", "engineer")
    tier = user.get("tier", "free")

    policies = []
    if not is_staff:
        policies = await db.node_policies.find({"active": True}, {"_id": 0}).to_list(500)

    allowed: dict[int, dict] = {}
    if policies:
        for p in policies:
            if tier in (p.get("allowed_tiers") or []):
                allowed[p["node_id"]] = p

    nodes = []
    for n in (data.get("data") or []):
        a = n.get("attributes") or {}
        node_id = a.get("id")
        if not is_staff and policies and node_id not in allowed:
            continue
        loc = ((a.get("relationships") or {}).get("location") or {}).get("attributes") or {}
        policy = allowed.get(node_id) if policies else None
        nodes.append({
            "id": node_id,
            "name": (policy or {}).get("display_name") or a.get("name"),
            "description": a.get("description"),
            "location": (policy or {}).get("location") or loc.get("short") or loc.get("long") or "—",
            "fqdn": a.get("fqdn"),
            "memory": a.get("memory"),
            "memory_overallocate": a.get("memory_overallocate"),
            "disk": a.get("disk"),
            "disk_overallocate": a.get("disk_overallocate"),
            "public": a.get("public"),
            "scheme": a.get("scheme"),
        })
    return nodes


@router.get("/admin/pterodactyl/nodes", dependencies=[Depends(require_admin)])
async def admin_list_nodes():
    return await list_nodes_public(user={"role": "admin"})


@router.get("/admin/pterodactyl/nests", dependencies=[Depends(require_admin)])
async def admin_list_nests():
    return await list_nests(user={"role": "admin"})


@router.get("/admin/pterodactyl/nodes/{node_id}/allocations", dependencies=[Depends(require_admin)])
async def admin_node_allocations(node_id: int):
    data = await ptero.list_node_allocations(int(node_id))
    out = []
    for a in (data.get("data") or []):
        attrs = a.get("attributes") or {}
        out.append({
            "id": attrs.get("id"),
            "ip": attrs.get("ip"),
            "port": attrs.get("port"),
            "alias": attrs.get("alias"),
            "assigned": attrs.get("assigned"),
        })
    return out
