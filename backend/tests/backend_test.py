"""End-to-end backend API tests for Avex Cloud."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://avex-hosting.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "firstadmin@avex.click"
ADMIN_PASS = "Admin12345!"

# unique user for this test run
RUN_ID = uuid.uuid4().hex[:6]
USER_EMAIL = f"test_user_{RUN_ID}@avex.click"
USER_PASS = "TestUser123!"


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="session")
def user_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": USER_EMAIL, "password": USER_PASS, "name": "Test User"}, timeout=20)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["role"] == "user", f"Expected role=user, got {data['role']}"
    assert data["is_first_user"] is False
    return s


# ---------- Health & Public ----------
class TestHealth:
    def test_health(self):
        r = requests.get(f"{API}/health", timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200

    def test_public_settings(self):
        r = requests.get(f"{API}/public/settings", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "discord_invite_url" in data
        assert data["discord_invite_url"]


# ---------- Plans ----------
class TestPlans:
    def test_list_plans(self):
        r = requests.get(f"{API}/plans", timeout=10)
        assert r.status_code == 200
        plans = r.json()
        assert isinstance(plans, list)
        assert len(plans) > 0

    def test_list_plans_by_category(self):
        for cat in ("hosting", "design", "video_editing"):
            r = requests.get(f"{API}/plans?category={cat}", timeout=10)
            assert r.status_code == 200
            for p in r.json():
                assert p["category"] == cat


# ---------- Auth ----------
class TestAuth:
    def test_admin_login(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "admin"
        # cookies were set
        assert "access_token" in s.cookies.get_dict() or "access_token" in data

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "nope_xxx@avex.click", "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_me_no_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code in (401, 403)

    def test_me_with_user(self, user_session):
        r = user_session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == USER_EMAIL
        assert data["role"] == "user"

    def test_forgot_password_no_crash(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "nonexistent@avex.click"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["ok"] is True


# ---------- Servers ----------
class TestServers:
    def test_create_and_list_server(self, user_session):
        payload = {"name": f"TEST_srv_{RUN_ID}", "game": "minecraft_java"}
        r = user_session.post(f"{API}/servers", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        srv = r.json()
        assert srv["name"] == payload["name"]
        assert srv["game"] == "minecraft_java"
        pytest.server_id = srv["id"]

        r = user_session.get(f"{API}/servers", timeout=10)
        assert r.status_code == 200
        servers = r.json()
        assert any(s["id"] == srv["id"] for s in servers)

    def test_free_tier_limit(self, user_session):
        r = user_session.post(f"{API}/servers", json={"name": f"TEST_srv2_{RUN_ID}", "game": "python"}, timeout=15)
        # free tier limited to 1
        assert r.status_code == 403, f"Expected 403 for free tier limit, got {r.status_code}"

    def test_power_on_and_stats(self, user_session):
        sid = pytest.server_id
        r = user_session.post(f"{API}/servers/{sid}/power?action=start", timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "starting"
        time.sleep(3)
        r = user_session.get(f"{API}/servers/{sid}", timeout=10)
        assert r.json()["status"] == "online"

        r = user_session.get(f"{API}/servers/{sid}/stats", timeout=10)
        assert r.status_code == 200
        assert "cpu_pct" in r.json()

    def test_console_command(self, user_session):
        sid = pytest.server_id
        r = user_session.post(f"{API}/servers/{sid}/console", json={"command": "list"}, timeout=10)
        assert r.status_code == 200
        lines = r.json()["lines"]
        joined = "\n".join(lines)
        assert "players online" in joined.lower()

    def test_install_uninstall_plugin(self, user_session):
        sid = pytest.server_id
        r = user_session.post(f"{API}/servers/{sid}/plugins/install",
                              json={"plugin_slug": "essentialsx", "plugin_name": "EssentialsX"}, timeout=10)
        assert r.status_code == 200
        r = user_session.get(f"{API}/servers/{sid}/plugins/installed", timeout=10)
        slugs = [p["slug"] for p in r.json()["installed"]]
        assert "essentialsx" in slugs
        r = user_session.post(f"{API}/servers/{sid}/plugins/uninstall",
                              json={"plugin_slug": "essentialsx", "plugin_name": "EssentialsX"}, timeout=10)
        assert r.status_code == 200
        r = user_session.get(f"{API}/servers/{sid}/plugins/installed", timeout=10)
        slugs = [p["slug"] for p in r.json()["installed"]]
        assert "essentialsx" not in slugs

    def test_stop_server(self, user_session):
        sid = pytest.server_id
        r = user_session.post(f"{API}/servers/{sid}/power?action=stop", timeout=10)
        assert r.status_code == 200


# ---------- Tickets ----------
class TestTickets:
    def test_create_and_reply_ticket(self, user_session):
        r = user_session.post(f"{API}/tickets", json={
            "subject": f"TEST_ticket_{RUN_ID}",
            "category": "support",
            "message": "Initial message from test"
        }, timeout=10)
        assert r.status_code == 200, r.text
        tid = r.json()["id"]
        pytest.ticket_id = tid

        r = user_session.get(f"{API}/tickets", timeout=10)
        assert r.status_code == 200
        assert any(t["id"] == tid for t in r.json())

        r = user_session.post(f"{API}/tickets/{tid}/reply", json={"body": "user reply"}, timeout=10)
        assert r.status_code == 200

        r = user_session.get(f"{API}/tickets/{tid}", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert len(data["messages"]) >= 2


# ---------- Billing ----------
class TestBilling:
    def test_list_invoices_empty(self, user_session):
        r = user_session.get(f"{API}/billing/invoices", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_checkout_creates_stripe_session(self, user_session):
        # get a paid plan
        plans = requests.get(f"{API}/plans?category=hosting", timeout=10).json()
        paid = next((p for p in plans if not p.get("is_free")), None)
        assert paid, "No paid plan found"

        r = user_session.post(f"{API}/billing/checkout", json={
            "plan_id": paid["id"],
            "origin_url": BASE_URL,
        }, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data
        assert "stripe.com" in data["url"] or "checkout" in data["url"].lower()

    def test_checkout_free_plan_rejected(self, user_session):
        plans = requests.get(f"{API}/plans?category=hosting", timeout=10).json()
        free = next((p for p in plans if p.get("is_free")), None)
        if not free:
            pytest.skip("No free plan")
        r = user_session.post(f"{API}/billing/checkout", json={
            "plan_id": free["id"],
            "origin_url": BASE_URL,
        }, timeout=15)
        assert r.status_code == 400


# ---------- Admin ----------
class TestAdmin:
    def test_admin_stats(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ("users", "active_servers", "total_servers", "open_tickets", "total_revenue"):
            assert k in d

    def test_admin_list_users(self, admin_session):
        r = admin_session.get(f"{API}/admin/users", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert any(u["email"] == ADMIN_EMAIL for u in r.json())

    def test_admin_settings_get_update(self, admin_session):
        r = admin_session.get(f"{API}/admin/settings", timeout=10)
        assert r.status_code == 200
        original = r.json().get("discord_invite_url")

        new_url = "https://discord.gg/8Y4deMVsm4"
        r = admin_session.put(f"{API}/admin/settings", json={"discord_invite_url": new_url}, timeout=10)
        assert r.status_code == 200

        # verify via public
        r = requests.get(f"{API}/public/settings", timeout=10)
        assert r.json()["discord_invite_url"] == new_url

    def test_admin_plan_crud(self, admin_session):
        new_plan = {
            "name": f"TEST_plan_{RUN_ID}",
            "category": "hosting",
            "price": 9.99,
            "currency": "USD",
            "cycle": "monthly",
            "ram_gb": 2,
            "cpu_cores": 1,
            "storage_gb": 10,
            "features": ["TEST feature"],
            "sort_order": 99,
        }
        r = admin_session.post(f"{API}/plans/admin", json=new_plan, timeout=10)
        assert r.status_code == 200, r.text
        plan_id = r.json()["id"]

        r = admin_session.put(f"{API}/plans/admin/{plan_id}", json={**new_plan, "price": 19.99}, timeout=10)
        assert r.status_code == 200

        r = requests.get(f"{API}/plans/{plan_id}", timeout=10)
        assert r.status_code == 200
        assert r.json()["price"] == 19.99

        r = admin_session.delete(f"{API}/plans/admin/{plan_id}", timeout=10)
        assert r.status_code == 200

    def test_admin_tickets_queue(self, admin_session):
        r = admin_session.get(f"{API}/tickets/admin/all", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_invoices_list(self, admin_session):
        r = admin_session.get(f"{API}/admin/invoices", timeout=10)
        assert r.status_code == 200

    def test_admin_create_staff(self, admin_session):
        staff_email = f"staff_{RUN_ID}@avex.click"
        r = admin_session.post(f"{API}/admin/users/staff", json={
            "email": staff_email,
            "name": "Staff Tester",
            "password": "StaffPass123!",
            "role": "staff",
        }, timeout=10)
        assert r.status_code == 200, r.text
        new_id = r.json()["id"]

        # change role
        r = admin_session.patch(f"{API}/admin/users/{new_id}/role", json={"role": "engineer"}, timeout=10)
        assert r.status_code == 200

        # delete
        r = admin_session.delete(f"{API}/admin/users/{new_id}", timeout=10)
        assert r.status_code == 200


# ---------- Cleanup ----------
@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    yield
    # No teardown needed; data is prefixed TEST_
