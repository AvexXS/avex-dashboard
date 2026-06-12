import React from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Layers, MessageSquare, FileText, Settings, LogOut, Globe, Tag, Server as ServerIcon, Shield, KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const items = [
  { to: "/admin", end: true, icon: LayoutDashboard, label: "Overview" },
  { to: "/admin/users", icon: Users, label: "Users & Staff" },
  { to: "/admin/servers", icon: ServerIcon, label: "Servers" },
  { to: "/admin/policies", icon: KeyRound, label: "Access Policies" },
  { to: "/admin/nodes", icon: Shield, label: "Infrastructure" },
  { to: "/admin/plans", icon: Layers, label: "Plans" },
  { to: "/admin/coupons", icon: Tag, label: "Coupons" },
  { to: "/admin/tickets", icon: MessageSquare, label: "Tickets" },
  { to: "/admin/invoices", icon: FileText, label: "Invoices" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const doLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-[#050505]">
        <div className="px-6 py-6 border-b border-white/10">
          <Link to="/" className="font-display text-2xl font-light tracking-tighter inline-flex items-center gap-2" data-testid="admin-logo">
            AVEX<span className="text-white/30">.</span>
            <span className="text-[10px] uppercase tracking-widest border border-white/15 px-1.5 py-0.5 text-white/60">ADMIN</span>
          </Link>
          <div className="mt-2 text-xs uppercase tracking-widest text-white/40 font-mono">{user?.role}</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              data-testid={`admin-nav-${it.label.toLowerCase().replace(/\s.+/, "")}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm uppercase tracking-wider transition-colors ${
                  isActive ? "bg-white text-black" : "text-white/60 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <it.icon className="w-4 h-4" strokeWidth={1.5} /> {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          <Link to="/dashboard" className="w-full inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white/60 hover:text-white border border-white/15 px-3 py-2 hover:bg-white/5" data-testid="admin-user-dashboard-link">
            <Globe className="w-3.5 h-3.5" /> User dashboard
          </Link>
          <button onClick={doLogout} data-testid="admin-logout-btn" className="w-full inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white/60 hover:text-white border border-white/15 px-3 py-2 hover:bg-white/5">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}
