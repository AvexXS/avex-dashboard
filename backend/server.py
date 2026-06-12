"""Avex Cloud — FastAPI entrypoint."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from db import init_indexes
from seed import seed_plans, seed_settings

from routes.auth import router as auth_router
from routes.plans import router as plans_router
from routes.servers import router as servers_router
from routes.tickets import router as tickets_router
from routes.billing import router as billing_router
from routes.admin import router as admin_router
from routes.public import router as public_router
from routes.webhook import router as webhook_router


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("avex")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_indexes()
    await seed_plans()
    await seed_settings()
    logger.info("Avex backend started")
    yield


app = FastAPI(title="Avex Cloud API", lifespan=lifespan)

_cors_origins = os.environ.get("CORS_ORIGINS", "*").strip()
if _cors_origins == "*" or _cors_origins == "":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Routers
app.include_router(auth_router)
app.include_router(public_router)
app.include_router(plans_router)
app.include_router(servers_router)
app.include_router(tickets_router)
app.include_router(billing_router)
app.include_router(admin_router)
app.include_router(webhook_router)


@app.get("/api/")
async def root():
    return {"app": "Avex Cloud", "status": "ok"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}
