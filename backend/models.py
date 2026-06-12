"""Pydantic models for Avex."""
from datetime import datetime, timezone
from typing import List, Optional, Literal
import uuid

from pydantic import BaseModel, EmailStr, Field, ConfigDict


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Auth ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    password: str = Field(min_length=6)


class VerifyEmailIn(BaseModel):
    token: str


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: Literal["user", "engineer", "staff", "admin"] = "user"
    email_verified: bool = False
    avatar_url: Optional[str] = None
    discord_id: Optional[str] = None
    google_id: Optional[str] = None
    created_at: str = Field(default_factory=_utc_now_iso)


# ---------- Plans ----------
class Plan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: Literal["hosting", "website_hosting", "design", "video_editing", "vps"]
    price: float
    currency: str = "USD"
    cycle: Literal["monthly", "one_time"] = "monthly"
    ram_gb: float = 0
    cpu_cores: float = 0
    storage_gb: float = 0
    features: List[str] = []
    is_free: bool = False
    active: bool = True
    sort_order: int = 0
    created_at: str = Field(default_factory=_utc_now_iso)


class PlanIn(BaseModel):
    name: str
    category: Literal["hosting", "website_hosting", "design", "video_editing", "vps"]
    price: float
    currency: str = "USD"
    cycle: Literal["monthly", "one_time"] = "monthly"
    ram_gb: float = 0
    cpu_cores: float = 0
    storage_gb: float = 0
    features: List[str] = []
    is_free: bool = False
    active: bool = True
    sort_order: int = 0


# ---------- Servers (Pterodactyl mock) ----------
class Server(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    game: Literal["minecraft_java", "minecraft_bedrock", "python", "nodejs", "other"] = "minecraft_java"
    plan_id: Optional[str] = None
    ram_gb: float = 2
    cpu_cores: float = 1
    storage_gb: float = 5
    status: Literal["offline", "starting", "online", "stopping"] = "offline"
    ip: str = "node-01.avex.click"
    port: int = 25565
    created_at: str = Field(default_factory=_utc_now_iso)


class ServerCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    game: Literal["minecraft_java", "minecraft_bedrock", "python", "nodejs", "other"] = "minecraft_java"


class ConsoleCommandIn(BaseModel):
    command: str


class PluginInstallIn(BaseModel):
    plugin_slug: str
    plugin_name: str


# ---------- Tickets ----------
class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    user_name: str
    subject: str
    category: Literal["support", "design", "video_editing", "vps_enquiry", "billing"] = "support"
    status: Literal["open", "in_progress", "closed"] = "open"
    priority: Literal["low", "normal", "high"] = "normal"
    assignee_id: Optional[str] = None
    plan_id: Optional[str] = None
    last_reply_at: str = Field(default_factory=_utc_now_iso)
    created_at: str = Field(default_factory=_utc_now_iso)


class TicketCreateIn(BaseModel):
    subject: str = Field(min_length=2, max_length=140)
    category: Literal["support", "design", "video_editing", "vps_enquiry", "billing"] = "support"
    message: str = Field(min_length=2)
    plan_id: Optional[str] = None
    priority: Literal["low", "normal", "high"] = "normal"


class TicketMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    author_id: str
    author_name: str
    author_role: str
    body: str
    created_at: str = Field(default_factory=_utc_now_iso)


class TicketReplyIn(BaseModel):
    body: str = Field(min_length=1)


class TicketStatusIn(BaseModel):
    status: Literal["open", "in_progress", "closed"]


# ---------- Invoices / Billing ----------
class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    user_id: str
    user_email: str
    plan_id: Optional[str] = None
    description: str
    amount: float
    currency: str = "USD"
    status: Literal["unpaid", "paid", "void"] = "unpaid"
    payment_method: Optional[str] = None
    session_id: Optional[str] = None
    paid_at: Optional[str] = None
    created_at: str = Field(default_factory=_utc_now_iso)


class CheckoutRequestIn(BaseModel):
    plan_id: str
    origin_url: str
    intent: Literal["plan_upgrade", "design_order"] = "plan_upgrade"
    details: Optional[str] = None
    subject: Optional[str] = None


class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: str
    user_email: str
    plan_id: Optional[str] = None
    invoice_id: Optional[str] = None
    amount: float
    currency: str = "USD"
    status: str = "initiated"
    payment_status: str = "pending"
    metadata: dict = {}
    created_at: str = Field(default_factory=_utc_now_iso)
    updated_at: str = Field(default_factory=_utc_now_iso)


# ---------- Settings (admin) ----------
class PlatformSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "platform_settings"
    pterodactyl_url: Optional[str] = None
    pterodactyl_api_key: Optional[str] = None
    discord_client_id: Optional[str] = None
    discord_client_secret: Optional[str] = None
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    paypal_client_id: Optional[str] = None
    paypal_client_secret: Optional[str] = None
    discord_invite_url: str = "https://discord.gg/8Y4deMVsm4"
    enabled_payment_methods: List[str] = ["stripe"]


class PlatformSettingsIn(BaseModel):
    pterodactyl_url: Optional[str] = None
    pterodactyl_api_key: Optional[str] = None
    discord_client_id: Optional[str] = None
    discord_client_secret: Optional[str] = None
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    paypal_client_id: Optional[str] = None
    paypal_client_secret: Optional[str] = None
    discord_invite_url: Optional[str] = None
    enabled_payment_methods: Optional[List[str]] = None


# ---------- Admin User Management ----------
class StaffCreateIn(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(min_length=6)
    role: Literal["engineer", "staff", "admin"] = "staff"


class UserRoleIn(BaseModel):
    role: Literal["user", "engineer", "staff", "admin"]
