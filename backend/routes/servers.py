"""Servers (Pterodactyl mock) routes."""
import asyncio
import random
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException, Depends

from db import db
from models import Server, ServerCreateIn, ConsoleCommandIn, PluginInstallIn
from auth_utils import get_current_user

router = APIRouter(prefix="/api/servers", tags=["servers"])


# In-memory console log per server (mock)
_CONSOLES: dict[str, list[str]] = {}


def _console(server_id: str) -> list[str]:
    if server_id not in _CONSOLES:
        _CONSOLES[server_id] = [
            "[INFO] Server initialized.",
            "[INFO] Loading game runtime...",
            "[INFO] Ready. Type 'help' for commands.",
        ]
    return _CONSOLES[server_id]


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")


@router.get("")
async def list_servers(user=Depends(get_current_user)):
    docs = await db.servers.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return docs


@router.post("")
async def create_server(payload: ServerCreateIn, user=Depends(get_current_user)):
    # Check free-tier limit unless premium
    existing = await db.servers.count_documents({"user_id": user["id"]})
    if existing >= 1 and user.get("role") == "user":
        # In v1, allow up to 3 servers if user.plan is set; otherwise 1.
        plan_id = user.get("active_plan_id")
        if not plan_id:
            raise HTTPException(status_code=403, detail="Free tier supports 1 server. Upgrade to premium to add more.")

    server = Server(
        user_id=user["id"],
        name=payload.name,
        game=payload.game,
        ram_gb=2,
        cpu_cores=1,
        storage_gb=5,
        port=random.randint(25500, 25599),
    )
    await db.servers.insert_one(server.model_dump())
    _CONSOLES[server.id] = [f"[{_ts()}] [INFO] Server {server.name} created."]
    return server.model_dump()


@router.get("/{server_id}")
async def get_server(server_id: str, user=Depends(get_current_user)):
    server = await db.servers.find_one({"id": server_id, "user_id": user["id"]}, {"_id": 0})
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


@router.delete("/{server_id}")
async def delete_server(server_id: str, user=Depends(get_current_user)):
    server = await db.servers.find_one({"id": server_id, "user_id": user["id"]})
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    await db.servers.delete_one({"id": server_id})
    _CONSOLES.pop(server_id, None)
    return {"ok": True}


@router.post("/{server_id}/power")
async def power_action(server_id: str, action: str, user=Depends(get_current_user)):
    server = await db.servers.find_one({"id": server_id, "user_id": user["id"]})
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    transitions = {
        "start": ("starting", "online", f"[{_ts()}] [INFO] Starting server..."),
        "stop": ("stopping", "offline", f"[{_ts()}] [INFO] Stopping server..."),
        "restart": ("starting", "online", f"[{_ts()}] [INFO] Restarting server..."),
        "kill": ("offline", "offline", f"[{_ts()}] [WARN] Server killed."),
    }
    if action not in transitions:
        raise HTTPException(status_code=400, detail="Invalid action")

    interim, final, log = transitions[action]
    _console(server_id).append(log)
    await db.servers.update_one({"id": server_id}, {"$set": {"status": interim}})

    async def settle():
        await asyncio.sleep(2)
        await db.servers.update_one({"id": server_id}, {"$set": {"status": final}})
        _console(server_id).append(f"[{_ts()}] [INFO] Server is now {final}.")

    asyncio.create_task(settle())
    return {"ok": True, "status": interim}


@router.get("/{server_id}/console")
async def get_console(server_id: str, user=Depends(get_current_user)):
    server = await db.servers.find_one({"id": server_id, "user_id": user["id"]})
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return {"lines": _console(server_id)[-200:]}


@router.post("/{server_id}/console")
async def send_console(server_id: str, payload: ConsoleCommandIn, user=Depends(get_current_user)):
    server = await db.servers.find_one({"id": server_id, "user_id": user["id"]})
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if server.get("status") != "online":
        raise HTTPException(status_code=400, detail="Server is not online")
    lines = _console(server_id)
    cmd = payload.command.strip()
    lines.append(f"[{_ts()}] > {cmd}")
    # Mock responses
    if cmd in ("help", "?"):
        lines.append(f"[{_ts()}] Commands: list, say <msg>, stop, time set day, kick <player>")
    elif cmd.startswith("say "):
        lines.append(f"[{_ts()}] [Server] {cmd[4:]}")
    elif cmd == "list":
        lines.append(f"[{_ts()}] There are 0/20 players online.")
    elif cmd == "stop":
        lines.append(f"[{_ts()}] [INFO] Stopping server...")
        await db.servers.update_one({"id": server_id}, {"$set": {"status": "offline"}})
    else:
        lines.append(f"[{_ts()}] [INFO] Executed: {cmd}")
    return {"ok": True, "lines": lines[-50:]}


@router.get("/{server_id}/stats")
async def get_stats(server_id: str, user=Depends(get_current_user)):
    server = await db.servers.find_one({"id": server_id, "user_id": user["id"]})
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    is_online = server.get("status") == "online"
    return {
        "cpu_pct": round(random.uniform(5, 65), 1) if is_online else 0,
        "ram_mb": round(random.uniform(400, server["ram_gb"] * 1024 - 100), 0) if is_online else 0,
        "ram_max_mb": server["ram_gb"] * 1024,
        "disk_mb": round(random.uniform(100, server["storage_gb"] * 1024 - 200), 0),
        "disk_max_mb": server["storage_gb"] * 1024,
        "uptime_s": random.randint(60, 86400) if is_online else 0,
        "players_online": random.randint(0, 12) if is_online else 0,
        "players_max": 20,
    }


# Plugins (Minecraft mock catalog)
_PLUGIN_CATALOG = [
    {"slug": "essentialsx", "name": "EssentialsX", "description": "Provides essential server commands.", "downloads": "3.2M", "category": "Admin Tools"},
    {"slug": "worldedit", "name": "WorldEdit", "description": "In-game map editor.", "downloads": "5.1M", "category": "Building"},
    {"slug": "luckperms", "name": "LuckPerms", "description": "Advanced permissions plugin.", "downloads": "4.8M", "category": "Admin Tools"},
    {"slug": "vault", "name": "Vault", "description": "Permissions/economy abstraction layer.", "downloads": "6.0M", "category": "API"},
    {"slug": "viaversion", "name": "ViaVersion", "description": "Lets newer clients join older servers.", "downloads": "8.4M", "category": "Compatibility"},
    {"slug": "placeholderapi", "name": "PlaceholderAPI", "description": "Powerful placeholder system.", "downloads": "5.6M", "category": "API"},
    {"slug": "discordsrv", "name": "DiscordSRV", "description": "Connect your server to Discord.", "downloads": "2.1M", "category": "Chat"},
    {"slug": "coreprotect", "name": "CoreProtect", "description": "Block logging & rollback.", "downloads": "3.7M", "category": "Admin Tools"},
    {"slug": "geyser", "name": "Geyser", "description": "Cross-platform Bedrock support.", "downloads": "4.0M", "category": "Compatibility"},
    {"slug": "vault-economy", "name": "EconomyAPI", "description": "Currency system for your server.", "downloads": "1.2M", "category": "Economy"},
]


@router.get("/{server_id}/plugins/catalog")
async def plugins_catalog(server_id: str, user=Depends(get_current_user)):
    server = await db.servers.find_one({"id": server_id, "user_id": user["id"]})
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return {"plugins": _PLUGIN_CATALOG}


@router.get("/{server_id}/plugins/installed")
async def plugins_installed(server_id: str, user=Depends(get_current_user)):
    server = await db.servers.find_one({"id": server_id, "user_id": user["id"]}, {"_id": 0})
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return {"installed": server.get("installed_plugins", [])}


@router.post("/{server_id}/plugins/install")
async def plugin_install(server_id: str, payload: PluginInstallIn, user=Depends(get_current_user)):
    server = await db.servers.find_one({"id": server_id, "user_id": user["id"]})
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    installed = server.get("installed_plugins", [])
    if any(p.get("slug") == payload.plugin_slug for p in installed):
        return {"ok": True, "already_installed": True}
    installed.append({"slug": payload.plugin_slug, "name": payload.plugin_name, "installed_at": datetime.now(timezone.utc).isoformat()})
    await db.servers.update_one({"id": server_id}, {"$set": {"installed_plugins": installed}})
    _console(server_id).append(f"[{_ts()}] [INFO] Installed plugin: {payload.plugin_name}")
    return {"ok": True, "installed": installed}


@router.post("/{server_id}/plugins/uninstall")
async def plugin_uninstall(server_id: str, payload: PluginInstallIn, user=Depends(get_current_user)):
    server = await db.servers.find_one({"id": server_id, "user_id": user["id"]})
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    installed = [p for p in server.get("installed_plugins", []) if p.get("slug") != payload.plugin_slug]
    await db.servers.update_one({"id": server_id}, {"$set": {"installed_plugins": installed}})
    _console(server_id).append(f"[{_ts()}] [INFO] Uninstalled plugin: {payload.plugin_name}")
    return {"ok": True, "installed": installed}
