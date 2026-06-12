"""Servers routes — proxies Pterodactyl Panel.
Avex enforces ownership via the local DB record; everything else hits Pterodactyl directly."""
import secrets
import string
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Body, Query
from pydantic import BaseModel

from db import db
from models import Server, ServerCreateIn, ConsoleCommandIn, DatabaseIn, BackupIn, ScheduleIn, FileUpdateIn, FileRenameIn
from auth_utils import get_current_user
import pterodactyl_client as ptero

router = APIRouter(prefix="/api/servers", tags=["servers"])


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _ensure_panel_user(user: dict) -> int:
    """Ensure the Avex user has a corresponding Pterodactyl panel user.
    Returns the panel user_id. If we don't have one stored, create it."""
    if user.get("pterodactyl_user_id"):
        return int(user["pterodactyl_user_id"])

    # Try find by email first
    panel = await ptero.find_panel_user_by_email(user["email"])
    if panel:
        panel_id = panel.get("id")
        await db.users.update_one({"id": user["id"]}, {"$set": {"pterodactyl_user_id": panel_id}})
        return int(panel_id)

    # Create a fresh user with a random password (user logs into Avex, not Pterodactyl)
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    password = "".join(secrets.choice(alphabet) for _ in range(20))
    username = f"avex_{user['id'][:8]}"
    parts = (user.get("name") or "Avex User").split(" ", 1)
    first = parts[0]
    last = parts[1] if len(parts) > 1 else "Avex"
    created = await ptero.create_panel_user(
        email=user["email"], username=username, first_name=first, last_name=last, password=password,
    )
    panel_id = created.get("attributes", {}).get("id") or created.get("data", {}).get("attributes", {}).get("id")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "pterodactyl_user_id": panel_id,
            "pterodactyl_username": username,
        }},
    )
    return int(panel_id)


async def _get_owned_server(server_id: str, user: dict) -> dict:
    s = await db.servers.find_one({"id": server_id, "user_id": user["id"]}, {"_id": 0})
    if not s and user.get("role") in ("admin", "staff", "engineer"):
        s = await db.servers.find_one({"id": server_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Server not found")
    return s


# ===================== Avex-side endpoints =====================

@router.get("")
async def list_servers(user=Depends(get_current_user)):
    docs = await db.servers.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@router.post("")
async def create_server(payload: dict = Body(...), user=Depends(get_current_user)):
    """Create a server on Pterodactyl.
    Payload: { name, egg_id, nest_id, node_id?, ram_mb, cpu_pct, disk_mb, environment? }
    """
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Server name is required")

    egg_id = payload.get("egg_id")
    nest_id = payload.get("nest_id")
    if not egg_id or not nest_id:
        raise HTTPException(status_code=400, detail="egg_id and nest_id are required")

    # Free-tier limit check (1 server unless premium)
    existing = await db.servers.count_documents({"user_id": user["id"]})
    if existing >= 1 and user.get("role") == "user" and not user.get("active_plan_id"):
        raise HTTPException(status_code=403, detail="Free tier supports 1 server. Upgrade to add more.")

    # Resolve resource limits (use defaults for free tier)
    ram_mb = int(payload.get("ram_mb") or 2048)
    cpu_pct = int(payload.get("cpu_pct") or 100)
    disk_mb = int(payload.get("disk_mb") or 5120)

    # Resolve egg details (need docker_image, startup, default env)
    egg_resp = await ptero.get_egg(int(nest_id), int(egg_id))
    egg_attrs = egg_resp.get("attributes") or {}
    docker_image = (
        payload.get("docker_image")
        or egg_attrs.get("docker_image")
        or (list((egg_attrs.get("docker_images") or {}).values())[0] if egg_attrs.get("docker_images") else None)
    )
    startup = payload.get("startup") or egg_attrs.get("startup") or ""

    # Build environment from egg variables (with overrides from payload)
    env_overrides = payload.get("environment") or {}
    environment: dict = {}
    relationships = egg_attrs.get("relationships") or {}
    variables = (relationships.get("variables") or {}).get("data") or []
    for v in variables:
        var = v.get("attributes") or {}
        env_var = var.get("env_variable")
        default = var.get("default_value")
        if env_var:
            environment[env_var] = env_overrides.get(env_var, default if default is not None else "")
    # Merge any extra overrides
    for k, val in env_overrides.items():
        environment.setdefault(k, val)

    # Pick a node and a free allocation
    node_id = payload.get("node_id")
    if not node_id:
        nodes = await ptero.list_nodes()
        candidates = nodes.get("data") or []
        if not candidates:
            raise HTTPException(status_code=400, detail="No Pterodactyl nodes available")
        node_id = candidates[0]["attributes"]["id"]

    allocation_id = await ptero.find_free_allocation(int(node_id))
    if not allocation_id:
        raise HTTPException(status_code=400, detail="No free allocations on selected node. Add allocations in Pterodactyl.")

    # Ensure panel user
    panel_user_id = await _ensure_panel_user(user)

    # Create on the panel
    created = await ptero.create_panel_server(
        name=name,
        user_panel_id=panel_user_id,
        egg_id=int(egg_id),
        nest_id=int(nest_id),
        docker_image=docker_image,
        startup=startup,
        environment=environment,
        limits={"memory": ram_mb, "swap": 0, "disk": disk_mb, "io": 500, "cpu": cpu_pct},
        feature_limits={"databases": int(payload.get("databases") or 2), "backups": int(payload.get("backups") or 3), "allocations": 1},
        allocation_id=int(allocation_id),
    )
    panel_attrs = created.get("attributes") or {}
    panel_server_id = panel_attrs.get("id")
    identifier = panel_attrs.get("identifier")

    # Persist Avex record
    server = Server(
        user_id=user["id"],
        name=name,
        game=payload.get("game", "minecraft_java"),
        ram_gb=ram_mb / 1024,
        cpu_cores=max(1, cpu_pct // 100),
        storage_gb=disk_mb / 1024,
        port=25565,
    )
    doc = server.model_dump()
    doc["pterodactyl_server_id"] = panel_server_id
    doc["pterodactyl_identifier"] = identifier
    doc["node_id"] = str(node_id)
    doc["egg_id"] = int(egg_id)
    doc["nest_id"] = int(nest_id)
    await db.servers.insert_one(doc)
    return doc


@router.get("/{server_id}")
async def get_server(server_id: str, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    # Enrich with live panel data
    identifier = s.get("pterodactyl_identifier")
    if identifier:
        try:
            details = await ptero.client_server_details(identifier)
            attrs = (details.get("attributes") or {})
            s["live"] = {
                "status": attrs.get("status"),
                "is_suspended": attrs.get("is_suspended"),
                "is_installing": attrs.get("is_installing"),
                "is_transferring": attrs.get("is_transferring"),
                "sftp_details": attrs.get("sftp_details"),
                "relationships": attrs.get("relationships"),
                "limits": attrs.get("limits"),
                "feature_limits": attrs.get("feature_limits"),
            }
        except HTTPException as e:
            s["live"] = {"error": e.detail}
    return s


@router.delete("/{server_id}")
async def delete_server(server_id: str, force: bool = False, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    if s.get("pterodactyl_server_id"):
        try:
            await ptero.delete_panel_server(int(s["pterodactyl_server_id"]), force=force)
        except HTTPException as e:
            if not force:
                raise
    await db.servers.delete_one({"id": server_id})
    return {"ok": True}


@router.post("/{server_id}/power")
async def power_action(server_id: str, action: str = Query(...), user=Depends(get_current_user)):
    if action not in ("start", "stop", "restart", "kill"):
        raise HTTPException(status_code=400, detail="Invalid power action")
    s = await _get_owned_server(server_id, user)
    identifier = s.get("pterodactyl_identifier")
    if not identifier:
        raise HTTPException(status_code=400, detail="Server has no Pterodactyl identifier")
    await ptero.client_power(identifier, action)
    return {"ok": True}


@router.post("/{server_id}/console")
async def send_console(server_id: str, payload: ConsoleCommandIn, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    identifier = s.get("pterodactyl_identifier")
    if not identifier:
        raise HTTPException(status_code=400, detail="Server has no Pterodactyl identifier")
    await ptero.client_send_command(identifier, payload.command)
    return {"ok": True}


@router.get("/{server_id}/websocket")
async def get_console_websocket(server_id: str, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    identifier = s.get("pterodactyl_identifier")
    if not identifier:
        raise HTTPException(status_code=400, detail="Server has no Pterodactyl identifier")
    data = await ptero.client_websocket(identifier)
    return data.get("data") or data


@router.get("/{server_id}/stats")
async def get_stats(server_id: str, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    identifier = s.get("pterodactyl_identifier")
    if not identifier:
        return {"cpu_pct": 0, "ram_mb": 0, "ram_max_mb": s.get("ram_gb", 2) * 1024, "disk_mb": 0, "disk_max_mb": s.get("storage_gb", 5) * 1024, "uptime_s": 0, "players_online": 0, "players_max": 0, "state": "unknown"}
    res = await ptero.client_resources(identifier)
    attrs = res.get("attributes") or {}
    r = attrs.get("resources") or {}
    return {
        "state": attrs.get("current_state", "unknown"),
        "cpu_pct": round(r.get("cpu_absolute", 0), 1),
        "ram_mb": round((r.get("memory_bytes", 0) or 0) / 1024 / 1024, 0),
        "ram_max_mb": (s.get("ram_gb", 2) * 1024),
        "disk_mb": round((r.get("disk_bytes", 0) or 0) / 1024 / 1024, 0),
        "disk_max_mb": (s.get("storage_gb", 5) * 1024),
        "network_rx": r.get("network_rx_bytes", 0),
        "network_tx": r.get("network_tx_bytes", 0),
        "uptime_s": round((r.get("uptime", 0) or 0) / 1000),
        "players_online": 0,
        "players_max": 0,
    }


# ===================== Files =====================

@router.get("/{server_id}/files")
async def list_files(server_id: str, directory: str = "/", user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    identifier = s["pterodactyl_identifier"]
    data = await ptero.files_list(identifier, directory)
    return data


@router.get("/{server_id}/files/contents")
async def get_file_contents(server_id: str, file: str = Query(...), user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    identifier = s["pterodactyl_identifier"]
    content = await ptero.files_contents(identifier, file)
    return {"content": content}


@router.post("/{server_id}/files/write")
async def write_file(server_id: str, payload: FileUpdateIn, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    identifier = s["pterodactyl_identifier"]
    await ptero.files_write(identifier, payload.path, payload.content)
    return {"ok": True}


class FolderIn(BaseModel):
    root: str
    name: str


@router.post("/{server_id}/files/create-folder")
async def create_folder(server_id: str, payload: FolderIn, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    await ptero.files_create_folder(s["pterodactyl_identifier"], payload.root, payload.name)
    return {"ok": True}


class FilesDeleteIn(BaseModel):
    root: str
    files: list[str]


@router.post("/{server_id}/files/delete")
async def delete_files(server_id: str, payload: FilesDeleteIn, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    await ptero.files_delete(s["pterodactyl_identifier"], payload.root, payload.files)
    return {"ok": True}


@router.put("/{server_id}/files/rename")
async def rename_file(server_id: str, payload: FileRenameIn, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    # payload.old_path is relative to root; we extract root + from + to
    parts = payload.old_path.rsplit("/", 1)
    root = parts[0] if len(parts) > 1 and parts[0] else "/"
    from_name = parts[-1]
    to_name = payload.new_name
    await ptero.files_rename(s["pterodactyl_identifier"], root, from_name, to_name)
    return {"ok": True}


# ===================== Databases =====================

@router.get("/{server_id}/databases")
async def list_databases(server_id: str, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    return await ptero.databases_list(s["pterodactyl_identifier"])


@router.post("/{server_id}/databases")
async def create_database(server_id: str, payload: DatabaseIn, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    return await ptero.databases_create(s["pterodactyl_identifier"], payload.name)


@router.delete("/{server_id}/databases/{db_id}")
async def delete_database(server_id: str, db_id: str, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    await ptero.databases_delete(s["pterodactyl_identifier"], db_id)
    return {"ok": True}


@router.post("/{server_id}/databases/{db_id}/rotate")
async def rotate_database(server_id: str, db_id: str, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    return await ptero.databases_rotate(s["pterodactyl_identifier"], db_id)


# ===================== Backups =====================

@router.get("/{server_id}/backups")
async def list_backups(server_id: str, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    return await ptero.backups_list(s["pterodactyl_identifier"])


@router.post("/{server_id}/backups")
async def create_backup(server_id: str, payload: BackupIn, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    return await ptero.backups_create(s["pterodactyl_identifier"], payload.name)


@router.post("/{server_id}/backups/{backup_uuid}/restore")
async def restore_backup(server_id: str, backup_uuid: str, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    return await ptero.backups_restore(s["pterodactyl_identifier"], backup_uuid)


@router.delete("/{server_id}/backups/{backup_uuid}")
async def delete_backup(server_id: str, backup_uuid: str, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    await ptero.backups_delete(s["pterodactyl_identifier"], backup_uuid)
    return {"ok": True}


# ===================== Schedules =====================

@router.get("/{server_id}/schedules")
async def list_schedules(server_id: str, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    return await ptero.schedules_list(s["pterodactyl_identifier"])


@router.post("/{server_id}/schedules")
async def create_schedule(server_id: str, payload: ScheduleIn, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    # Parse cron string "m h dom mon dow"
    parts = payload.cron.strip().split()
    if len(parts) != 5:
        raise HTTPException(status_code=400, detail="Cron must have 5 fields: m h dom mon dow")
    cron = {
        "minute": parts[0],
        "hour": parts[1],
        "day_of_month": parts[2],
        "month": parts[3],
        "day_of_week": parts[4],
    }
    return await ptero.schedules_create(s["pterodactyl_identifier"], payload.name, cron, payload.enabled)


@router.delete("/{server_id}/schedules/{schedule_id}")
async def delete_schedule(server_id: str, schedule_id: int, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    await ptero.schedules_delete(s["pterodactyl_identifier"], schedule_id)
    return {"ok": True}


# ===================== Allocations =====================

@router.get("/{server_id}/allocations")
async def list_allocations(server_id: str, user=Depends(get_current_user)):
    s = await _get_owned_server(server_id, user)
    return await ptero.server_allocations(s["pterodactyl_identifier"])
