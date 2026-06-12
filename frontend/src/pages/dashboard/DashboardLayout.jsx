import React from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { Server, Ticket, CreditCard, User, LogOut, LayoutGrid, ArrowUpRight, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const items = [
  { to: "/dashboard", end: true, icon: LayoutGrid, label: "Overview" },
  { to: "/dashboard/servers", icon: Server, label: "Servers" },
  { to: "/dashboard/tickets", icon: Ticket, label: "Tickets" },
  { to: "/dashboard/billing", icon: CreditCard, label: "Billing" },
  { to: "/dashboard/account", icon: User, label: "Account" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const doLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 flex flex-col">
        <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-light tracking-tighter" data-testid="dashboard-logo">
            AVEX<span className="text-white/30">.</span>
          </Link>
          {["admin", "staff", "engineer"].includes(user?.role) && (
            <Link to="/admin" className="text-xs uppercase tracking-wider text-white/50 hover:text-white inline-flex items-center gap-1" data-testid="dashboard-admin-link">
              <Shield className="w-3.5 h-3.5" /> Admin
            </Link>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              data-testid={`dashboard-nav-${it.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm uppercase tracking-wider transition-colors ${
                  isActive ? "bg-white text-black" : "text-white/60 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <it.icon className="w-4 h-4" strokeWidth={1.5} />
              {it.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-1">Account</div>
          <div className="text-sm text-white truncate">{user?.name}</div>
          <div className="text-xs text-white/40 truncate">{user?.email}</div>
          <button
            onClick={doLogout}
            data-testid="dashboard-logout-btn"
            className="mt-3 w-full inline-flex items-center gap-2 text-sm uppercase tracking-wider text-white/60 hover:text-white border border-white/15 px-3 py-2 hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="border-b border-white/10 px-6 md:px-10 py-4 flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-white/40 font-mono">avex / dashboard</div>
          <a href="https://discord.gg/8Y4deMVsm4" target="_blank" rel="noreferrer" className="text-xs uppercase tracking-wider text-white/40 hover:text-white inline-flex items-center gap-1">
            Need help <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        <div className="p-6 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
