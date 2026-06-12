import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/pricing", label: "Hosting" },
  { to: "/design", label: "Design" },
  { to: "/vps", label: "VPS" },
  { to: "/about", label: "About" },
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

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-black/70 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        <Link to="/" data-testid="navbar-logo" className="font-display text-2xl font-light tracking-tighter">
          AVEX<span className="text-white/30">.</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`navbar-link-${n.label.toLowerCase()}`}
              className={({ isActive }) =>
                `text-sm tracking-wide uppercase transition-colors ${isActive ? "text-white" : "text-white/50 hover:text-white"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
          <a
            href={discordUrl}
            target="_blank"
            rel="noreferrer"
            data-testid="navbar-link-discord"
            className="text-sm tracking-wide uppercase text-white/50 hover:text-white inline-flex items-center gap-1"
          >
            Discord <ArrowUpRight className="w-3 h-3" />
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {["admin", "staff", "engineer"].includes(user?.role) && (
                <Link
                  to="/admin"
                  data-testid="navbar-admin-link"
                  className="text-sm uppercase tracking-wide text-white/60 hover:text-white"
                >
                  Admin
                </Link>
              )}
              <Link
                to="/dashboard"
                data-testid="navbar-dashboard-btn"
                className="bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="navbar-login-btn" className="text-sm uppercase tracking-wide text-white/60 hover:text-white">
                Login
              </Link>
              <Link
                to="/signup"
                data-testid="navbar-signup-btn"
                className="bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors"
              >
                Start free
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden text-white"
          onClick={() => setOpen(!open)}
          data-testid="navbar-mobile-toggle"
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 bg-black">
          <div className="px-6 py-6 space-y-4">
            {navItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="block text-base uppercase tracking-wide text-white/70"
                data-testid={`navbar-mobile-${n.label.toLowerCase()}`}
              >
                {n.label}
              </Link>
            ))}
            <a href={discordUrl} target="_blank" rel="noreferrer" className="block text-base uppercase tracking-wide text-white/70">
              Discord
            </a>
            <div className="pt-4 border-t border-white/10 flex gap-3">
              {user ? (
                <Link to="/dashboard" className="bg-white text-black px-5 py-2.5 text-sm font-medium flex-1 text-center">Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="border border-white/20 px-5 py-2.5 text-sm flex-1 text-center">Login</Link>
                  <Link to="/signup" className="bg-white text-black px-5 py-2.5 text-sm font-medium flex-1 text-center">Start free</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
