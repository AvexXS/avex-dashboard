"""Pterodactyl API client. Hits Application API (for CRUD) + Client API (admin's key,
which has access to all servers, used to proxy file/database/backup/console actions on
behalf of users — Avex enforces ownership in our own DB before calling Pterodactyl)."""

from __future__ import annotations
from typing import Optional, Any

import httpx
from fastapi import HTTPException

from db import db


class PterodactylNotConfigured(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=503,
            detail="Pterodactyl is not configured. Ask an admin to set the panel URL, "
                   "Application API key, and Admin Client API key in Admin → Settings.",
        )


async def get_pterodactyl_config() -> dict:
    """Returns the active Pterodactyl config or raises PterodactylNotConfigured."""
    doc = await db.settings.find_one({"id": "platform_settings"}, {"_id": 0}) or {}
    url = (doc.get("pterodactyl_url") or "").strip().rstrip("/")
    app_key = (doc.get("pterodactyl_api_key") or "").strip()
    client_key = (doc.get("pterodactyl_client_key") or "").strip()
    if not url or not app_key:
        raise PterodactylNotConfigured()
    return {"url": url, "app_key": app_key, "client_key": client_key}


def _app_headers(app_key: str) -> dict:
    return {
        "Authorization": f"Bearer {app_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _client_headers(client_key: str) -> dict:
    if not client_key:
        raise HTTPException(
            status_code=503,
            detail="Pterodactyl Admin Client API key not set. Add it in Admin → Settings.",
        )
    return {
        "Authorization": f"Bearer {client_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


async def _request(method: str, url: str, headers: dict, **kwargs) -> Any:
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as c:
        r = await c.request(method, url, headers=headers, **kwargs)
        if r.status_code == 204:
            return {}
        try:
            data = r.json() if r.content else {}
        except ValueError:
            data = {"raw": r.text}
        if r.is_success:
            return data
        # Surface useful error message
        msg = "Pterodactyl error"
        if isinstance(data, dict):
            errs = data.get("errors") or []
            if errs and isinstance(errs, list):
                msg = "; ".join(
                    f"{e.get('code', '')} {e.get('detail') or e.get('title') or ''}".strip()
                    for e in errs
                ) or msg
        raise HTTPException(status_code=r.status_code, detail=msg)


# ===================== Application API (admin-level) =====================

async def app_get(path: str) -> Any:
    cfg = await get_pterodactyl_config()
    return await _request("GET", f"{cfg['url']}/api/application{path}", _app_headers(cfg["app_key"]))


async def app_post(path: str, body: dict | None = None) -> Any:
    cfg = await get_pterodactyl_config()
    return await _request("POST", f"{cfg['url']}/api/application{path}", _app_headers(cfg["app_key"]), json=body or {})


async def app_patch(path: str, body: dict | None = None) -> Any:
    cfg = await get_pterodactyl_config()
    return await _request("PATCH", f"{cfg['url']}/api/application{path}", _app_headers(cfg["app_key"]), json=body or {})


async def app_delete(path: str) -> Any:
    cfg = await get_pterodactyl_config()
    return await _request("DELETE", f"{cfg['url']}/api/application{path}", _app_headers(cfg["app_key"]))


# Users
async def list_panel_users(): return await app_get("/users")
async def find_panel_user_by_email(email: str):
    data = await app_get(f"/users?filter[email]={email}")
    arr = data.get("data") or []
    return arr[0]["attributes"] if arr else None


async def create_panel_user(email: str, username: str, first_name: str, last_name: str, password: str, root_admin: bool = False) -> dict:
    return await app_post("/users", {
        "email": email,
        "username": username,
        "first_name": first_name or username,
        "last_name": last_name or "Avex",
        "password": password,
        "root_admin": root_admin,
    })


async def delete_panel_user(user_id: int):
    await app_delete(f"/users/{user_id}")


# Nodes + Allocations + Locations
async def list_nodes(): return await app_get("/nodes?include=location")
async def list_node_allocations(node_id: int): return await app_get(f"/nodes/{node_id}/allocations?per_page=200")


async def find_free_allocation(node_id: int) -> Optional[int]:
    data = await list_node_allocations(node_id)
    for a in (data.get("data") or []):
        attrs = a.get("attributes") or {}
        if not attrs.get("assigned"):
            return attrs.get("id")
    return None


# Nests + Eggs
async def list_nests(): return await app_get("/nests?include=eggs")


async def list_eggs(nest_id: int): return await app_get(f"/nests/{nest_id}/eggs?include=variables")


async def get_egg(nest_id: int, egg_id: int): return await app_get(f"/nests/{nest_id}/eggs/{egg_id}?include=variables")


# Servers (Application — admin)
async def create_panel_server(
    *,
    name: str,
    user_panel_id: int,
    egg_id: int,
    docker_image: str,
    startup: str,
    environment: dict,
    limits: dict,
    feature_limits: dict,
    allocation_id: int,
    description: str = "",
    nest_id: int | None = None,
    skip_scripts: bool = False,
):
    body = {
        "name": name,
        "user": user_panel_id,
        "egg": egg_id,
        "docker_image": docker_image,
        "startup": startup,
        "environment": environment or {},
        "limits": limits or {},
        "feature_limits": feature_limits or {"databases": 1, "backups": 1, "allocations": 1},
        "allocation": {"default": allocation_id},
        "description": description,
        "start_on_completion": False,
        "skip_scripts": skip_scripts,
    }
    if nest_id:
        body["nest"] = nest_id
    return await app_post("/servers", body)


async def get_panel_server(server_id: int): return await app_get(f"/servers/{server_id}?include=allocations,user,node,nest,egg")


async def delete_panel_server(server_id: int, force: bool = False):
    suffix = "/force" if force else ""
    await app_delete(f"/servers/{server_id}{suffix}")


async def suspend_panel_server(server_id: int):
    return await app_post(f"/servers/{server_id}/suspend")


async def unsuspend_panel_server(server_id: int):
    return await app_post(f"/servers/{server_id}/unsuspend")


# ===================== Client API (uses admin's Client key) =====================

async def client_get(identifier: str, path: str = "") -> Any:
    cfg = await get_pterodactyl_config()
    return await _request("GET", f"{cfg['url']}/api/client/servers/{identifier}{path}", _client_headers(cfg["client_key"]))


async def client_post(identifier: str, path: str = "", body: dict | None = None) -> Any:
    cfg = await get_pterodactyl_config()
    return await _request("POST", f"{cfg['url']}/api/client/servers/{identifier}{path}", _client_headers(cfg["client_key"]), json=body or {})


async def client_delete(identifier: str, path: str = "") -> Any:
    cfg = await get_pterodactyl_config()
    return await _request("DELETE", f"{cfg['url']}/api/client/servers/{identifier}{path}", _client_headers(cfg["client_key"]))


async def client_put(identifier: str, path: str = "", body: dict | None = None) -> Any:
    cfg = await get_pterodactyl_config()
    return await _request("PUT", f"{cfg['url']}/api/client/servers/{identifier}{path}", _client_headers(cfg["client_key"]), json=body or {})


# Resources & power
async def client_server_details(identifier: str): return await client_get(identifier, "")
async def client_resources(identifier: str): return await client_get(identifier, "/resources")
async def client_power(identifier: str, signal: str): return await client_post(identifier, "/power", {"signal": signal})
async def client_send_command(identifier: str, command: str): return await client_post(identifier, "/command", {"command": command})


# Websocket auth (for live console + stats)
async def client_websocket(identifier: str): return await client_get(identifier, "/websocket")


# Files
async def files_list(identifier: str, directory: str = "/"):
    cfg = await get_pterodactyl_config()
    return await _request(
        "GET",
        f"{cfg['url']}/api/client/servers/{identifier}/files/list",
        _client_headers(cfg["client_key"]),
        params={"directory": directory},
    )


async def files_contents(identifier: str, file: str) -> str:
    cfg = await get_pterodactyl_config()
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.get(
            f"{cfg['url']}/api/client/servers/{identifier}/files/contents",
            headers=_client_headers(cfg["client_key"]),
            params={"file": file},
        )
        if not r.is_success:
            raise HTTPException(status_code=r.status_code, detail=r.text[:500] or "File read error")
        return r.text


async def files_write(identifier: str, file: str, content: str):
    cfg = await get_pterodactyl_config()
    async with httpx.AsyncClient(timeout=60.0) as c:
        r = await c.post(
            f"{cfg['url']}/api/client/servers/{identifier}/files/write",
            headers={
                "Authorization": f"Bearer {cfg['client_key']}",
                "Accept": "application/json",
                "Content-Type": "text/plain",
            },
            params={"file": file},
            content=content,
        )
        if not r.is_success:
            raise HTTPException(status_code=r.status_code, detail=r.text[:500] or "File write error")
        return {"ok": True}


async def files_create_folder(identifier: str, root: str, name: str):
    return await client_post(identifier, "/files/create-folder", {"root": root, "name": name})


async def files_delete(identifier: str, root: str, files: list[str]):
    return await client_post(identifier, "/files/delete", {"root": root, "files": files})


async def files_rename(identifier: str, root: str, from_path: str, to_path: str):
    return await client_put(identifier, "/files/rename", {"root": root, "files": [{"from": from_path, "to": to_path}]})


async def files_download_url(identifier: str, file: str):
    cfg = await get_pterodactyl_config()
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.get(
            f"{cfg['url']}/api/client/servers/{identifier}/files/download",
            headers=_client_headers(cfg["client_key"]),
            params={"file": file},
        )
        if not r.is_success:
            raise HTTPException(status_code=r.status_code, detail="Download URL error")
        return r.json()


# Databases
async def databases_list(identifier: str): return await client_get(identifier, "/databases")
async def databases_create(identifier: str, name: str, remote: str = "%"): return await client_post(identifier, "/databases", {"database": name, "remote": remote})
async def databases_delete(identifier: str, db_id: str): return await client_delete(identifier, f"/databases/{db_id}")
async def databases_rotate(identifier: str, db_id: str): return await client_post(identifier, f"/databases/{db_id}/rotate-password")


# Backups
async def backups_list(identifier: str): return await client_get(identifier, "/backups")
async def backups_create(identifier: str, name: str | None = None): return await client_post(identifier, "/backups", {"name": name} if name else {})
async def backups_restore(identifier: str, backup_uuid: str, truncate: bool = False): return await client_post(identifier, f"/backups/{backup_uuid}/restore", {"truncate": truncate})
async def backups_delete(identifier: str, backup_uuid: str): return await client_delete(identifier, f"/backups/{backup_uuid}")


# Schedules
async def schedules_list(identifier: str): return await client_get(identifier, "/schedules")
async def schedules_create(identifier: str, name: str, cron: dict, is_active: bool = True):
    return await client_post(identifier, "/schedules", {
        "name": name,
        "minute": cron.get("minute", "*/30"),
        "hour": cron.get("hour", "*"),
        "day_of_month": cron.get("day_of_month", "*"),
        "month": cron.get("month", "*"),
        "day_of_week": cron.get("day_of_week", "*"),
        "is_active": is_active,
        "only_when_online": False,
    })


async def schedules_delete(identifier: str, schedule_id: int):
    return await client_delete(identifier, f"/schedules/{schedule_id}")


# Network / Allocations on the server (client view)
async def server_allocations(identifier: str): return await client_get(identifier, "/network/allocations")
