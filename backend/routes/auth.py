"""Auth routes: register, login, verify-email, forgot/reset password, me, refresh, logout."""
import os
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Request, Response, Depends

from db import db
from models import (
    RegisterIn, LoginIn, ForgotPasswordIn, ResetPasswordIn, VerifyEmailIn, User
)
from auth_utils import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, get_current_user, gen_token,
)
from email_service import send_verification_email, send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)


def _frontend_url(request: Request) -> str:
    # Best effort: use referer host or REACT_APP_BACKEND_URL fallback
    origin = request.headers.get("origin") or request.headers.get("referer")
    if origin:
        from urllib.parse import urlparse
        u = urlparse(origin)
        return f"{u.scheme}://{u.netloc}"
    return os.environ.get("FRONTEND_URL", "")


@router.post("/register")
async def register(payload: RegisterIn, request: Request, response: Response):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # First user becomes admin
    is_first_user = (await db.users.count_documents({})) == 0
    role = "admin" if is_first_user else "user"

    user = User(email=email, name=payload.name, role=role, email_verified=is_first_user)
    doc = user.model_dump()
    doc["password_hash"] = hash_password(payload.password)
    await db.users.insert_one(doc)

    # Email verification
    if not is_first_user:
        token = gen_token(32)
        await db.email_verifications.insert_one({
            "token": token,
            "user_id": user.id,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
        })
        verify_url = f"{_frontend_url(request)}/verify-email?token={token}"
        await send_verification_email(email, payload.name, verify_url)

    access = create_access_token(user.id, user.email, user.role)
    refresh = create_refresh_token(user.id)
    set_auth_cookies(response, access, refresh)

    return {**user.model_dump(), "access_token": access, "is_first_user": is_first_user}


@router.post("/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower()
    ip = request.client.host if request.client else "0.0.0.0"
    identifier = f"{ip}:{email}"

    # Brute force check
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.fromisoformat(locked_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {
                "$inc": {"count": 1},
                "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()},
            },
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})

    access = create_access_token(user["id"], user["email"], user.get("role", "user"))
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)

    user.pop("password_hash", None)
    user.pop("_id", None)
    return {**user, "access_token": access}


@router.post("/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return user


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    import jwt as _jwt
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = _jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access = create_access_token(user["id"], user["email"], user.get("role", "user"))
    new_refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, new_refresh)
    return {"ok": True, "access_token": access}


@router.post("/verify-email")
async def verify_email(payload: VerifyEmailIn):
    rec = await db.email_verifications.find_one({"token": payload.token})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    expires = rec.get("expires_at")
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires)
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires and expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")

    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"email_verified": True}})
    await db.email_verifications.delete_one({"token": payload.token})
    return {"ok": True}


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordIn, request: Request):
    user = await db.users.find_one({"email": payload.email.lower()})
    # Always return ok to avoid email enumeration
    if user:
        token = gen_token(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["id"],
            "used": False,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        })
        reset_url = f"{_frontend_url(request)}/reset-password?token={token}"
        await send_password_reset_email(user["email"], user.get("name", "there"), reset_url)
    return {"ok": True}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordIn):
    rec = await db.password_reset_tokens.find_one({"token": payload.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or used token")
    expires = rec.get("expires_at")
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires)
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires and expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")

    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(payload.password)}})
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}
