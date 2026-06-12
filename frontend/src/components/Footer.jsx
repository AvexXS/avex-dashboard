import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";

const links = {
  Platform: [
    { to: "/pricing", label: "Hosting" },
    { to: "/design", label: "Design Services" },
    { to: "/vps", label: "VPS / Dedicated" },
    { to: "/about", label: "About" },
  ],
  Legal: [
    { to: "/legal/terms", label: "Terms of Service" },
    { to: "/legal/privacy", label: "Privacy Policy" },
    { to: "/legal/fair-use", label: "Fair Use Policy" },
    { to: "/legal/payment-terms", label: "Payment Terms" },
  ],
};

export default function Footer() {
  const [discordUrl, setDiscordUrl] = useState("https://discord.gg/8Y4deMVsm4");
  useEffect(() => {
    api.get("/public/settings").then(({ data }) => setDiscordUrl(data?.discord_invite_url || discordUrl)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <footer className="border-t border-white/10 bg-black mt-24">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <div className="font-display text-4xl font-light tracking-tighter">AVEX<span className="text-white/30">.</span></div>
          <p className="mt-4 text-white/50 text-sm max-w-md leading-relaxed">
            High performance servers &amp; designs at a low performance price. Run game servers, ship beautiful websites, and post sharper video.
          </p>
          <a href={discordUrl} target="_blank" rel="noreferrer" data-testid="footer-discord-link" className="inline-block mt-6 text-sm uppercase tracking-wide text-white/70 hover:text-white border-b border-white/30 hover:border-white">
            Join the Discord →
          </a>
        </div>

        {Object.entries(links).map(([title, items]) => (
          <div key={title} className="md:col-span-2">
            <div className="text-xs uppercase tracking-widest text-white/40 mb-4">{title}</div>
            <ul className="space-y-2">
              {items.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-white/70 hover:text-white" data-testid={`footer-link-${l.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="md:col-span-3">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Account</div>
          <ul className="space-y-2">
            <li><Link to="/login" className="text-sm text-white/70 hover:text-white">Login</Link></li>
            <li><Link to="/signup" className="text-sm text-white/70 hover:text-white">Sign up</Link></li>
            <li><Link to="/dashboard" className="text-sm text-white/70 hover:text-white">Dashboard</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-white/40">© {new Date().getFullYear()} Avex Cloud. All rights reserved.</div>
          <div className="text-xs text-white/40 font-mono">avex.click</div>
        </div>
      </div>
    </footer>
  );
}
