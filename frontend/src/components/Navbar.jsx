import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { to: "/pricing", label: "Game Server Hosting" },
  { to: "#soon", label: "Website Hosting", soon: true },
  { to: "/design", label: "Design" },
  { to: "/vps", label: "VPS" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [discordUrl, setDiscordUrl] = useState("https://discord.gg/8Y4deMVsm4");
  const { user } = useAuth();

  useEffect(() => {
    api.get("/public/settings").then(({ data }) => {
      if (data?.discord_invite_url) setDiscordUrl(data.discord_invite_url);
    }).catch(() => {});
  }, []);

  const onSoonClick = (e) => {
    e.preventDefault();
    toast.message("Website hosting", { description: "Coming soon. Pop into our Discord for early access." });
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-6xl">
      <header className="bg-black/70 backdrop-blur-xl border border-white/15 rounded-full shadow-[0_20px_60px_-12px_rgba(0,0,0,0.8)]">
        <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" data-testid="navbar-logo" className="font-display text-xl font-light tracking-tighter shrink-0">
            AVEX<span className="text-white/30">.</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((n) => {
              if (n.soon) {
                return (
                  <button
                    key={n.label}
                    onClick={onSoonClick}
                    data-testid={`navbar-link-${n.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className="group relative px-3 py-2 text-xs uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors inline-flex items-center gap-2"
                  >
                    {n.label}
                    <span className="text-[9px] uppercase tracking-widest bg-white/10 text-white/70 px-1.5 py-0.5 rounded-full">Soon</span>
                  </button>
                );
              }
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  data-testid={`navbar-link-${n.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className={({ isActive }) =>
                    `px-3 py-2 text-xs uppercase tracking-wider transition-colors ${isActive ? "text-white" : "text-white/55 hover:text-white"}`
                  }
                >
                  {n.label}
                </NavLink>
              );
            })}
            <a
              href={discordUrl}
              target="_blank"
              rel="noreferrer"
              data-testid="navbar-link-discord"
              className="px-3 py-2 text-xs uppercase tracking-wider text-white/55 hover:text-white inline-flex items-center gap-1"
            >
              Discord <ArrowUpRight className="w-3 h-3" />
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            {user ? (
              <>
                {["admin", "staff", "engineer"].includes(user?.role) && (
                  <Link
                    to="/admin"
                    data-testid="navbar-admin-link"
                    className="text-xs uppercase tracking-wider px-3 py-2 text-white/60 hover:text-white"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  data-testid="navbar-dashboard-btn"
                  className="bg-white text-black px-4 py-2 text-xs uppercase tracking-wider font-medium hover:bg-white/90 transition-colors rounded-full"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" data-testid="navbar-login-btn" className="text-xs uppercase tracking-wider px-3 py-2 text-white/60 hover:text-white">
                  Login
                </Link>
                <Link
                  to="/signup"
                  data-testid="navbar-signup-btn"
                  className="bg-white text-black px-4 py-2 text-xs uppercase tracking-wider font-medium hover:bg-white/90 transition-colors rounded-full"
                >
                  Start free
                </Link>
              </>
            )}
          </div>

          <button
            className="lg:hidden md:order-last text-white p-1"
            onClick={() => setOpen(!open)}
            data-testid="navbar-mobile-toggle"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {open && (
        <div className="lg:hidden mt-2 bg-black/90 backdrop-blur-xl border border-white/15 rounded-2xl p-5">
          <div className="space-y-2">
            {navItems.map((n) => (
              n.soon ? (
                <button
                  key={n.label}
                  onClick={(e) => { onSoonClick(e); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm uppercase tracking-wider text-white/40 inline-flex items-center justify-between"
                  data-testid={`navbar-mobile-${n.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {n.label}
                  <span className="text-[9px] uppercase tracking-widest bg-white/10 text-white/70 px-1.5 py-0.5 rounded-full">Soon</span>
                </button>
              ) : (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-sm uppercase tracking-wider text-white/70"
                  data-testid={`navbar-mobile-${n.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {n.label}
                </Link>
              )
            ))}
            <a href={discordUrl} target="_blank" rel="noreferrer" className="block px-3 py-2 text-sm uppercase tracking-wider text-white/70">
              Discord
            </a>
            <div className="pt-3 mt-2 border-t border-white/10 flex gap-2">
              {user ? (
                <Link to="/dashboard" className="bg-white text-black px-4 py-2 text-xs uppercase tracking-wider font-medium flex-1 text-center rounded-full">Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="border border-white/20 px-4 py-2 text-xs uppercase tracking-wider flex-1 text-center rounded-full">Login</Link>
                  <Link to="/signup" className="bg-white text-black px-4 py-2 text-xs uppercase tracking-wider font-medium flex-1 text-center rounded-full">Start free</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
