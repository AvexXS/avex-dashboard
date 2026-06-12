import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Server, Ticket, CreditCard, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function DashboardHome() {
  const { user } = useAuth();
  const [servers, setServers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/servers"),
      api.get("/tickets"),
      api.get("/billing/invoices"),
    ]).then(([s, t, i]) => {
      setServers(s.data);
      setTickets(t.data);
      setInvoices(i.data);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-12">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Welcome back</div>
        <h1 className="font-display text-5xl md:text-6xl font-light tracking-tighter mt-3">
          Hello, <span className="text-white/40">{user?.name?.split(" ")[0]}.</span>
        </h1>
        <p className="mt-2 text-white/50 max-w-2xl text-sm">
          {user?.email_verified ? "Your account is fully verified." : "Verify your email to unlock all features."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10">
        <Stat label="Active Servers" value={servers.filter((s) => s.status === "online").length} total={servers.length} />
        <Stat label="Open Tickets" value={tickets.filter((t) => t.status !== "closed").length} total={tickets.length} />
        <Stat label="Unpaid Invoices" value={invoices.filter((i) => i.status === "unpaid").length} total={invoices.length} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Link to="/dashboard/servers" data-testid="home-quick-servers" className="md:col-span-5 border border-white/10 p-8 hover:border-white/30 lift group bg-[#0a0a0a]">
          <Server className="w-7 h-7 mb-6" strokeWidth={1.25} />
          <h3 className="font-display text-2xl tracking-tight">Manage servers</h3>
          <p className="text-white/50 text-sm mt-2">Start, stop, restart. Open the console. Install plugins.</p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm uppercase tracking-wider text-white/70 group-hover:text-white">Open <ArrowUpRight className="w-4 h-4" /></div>
        </Link>
        <Link to="/dashboard/tickets" data-testid="home-quick-tickets" className="md:col-span-4 border border-white/10 p-8 hover:border-white/30 lift group bg-[#0a0a0a]">
          <Ticket className="w-7 h-7 mb-6" strokeWidth={1.25} />
          <h3 className="font-display text-2xl tracking-tight">Tickets</h3>
          <p className="text-white/50 text-sm mt-2">Support, design and editing requests.</p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm uppercase tracking-wider text-white/70 group-hover:text-white">Open <ArrowUpRight className="w-4 h-4" /></div>
        </Link>
        <Link to="/dashboard/billing" data-testid="home-quick-billing" className="md:col-span-3 border border-white/10 p-8 hover:border-white/30 lift group bg-[#0a0a0a]">
          <CreditCard className="w-7 h-7 mb-6" strokeWidth={1.25} />
          <h3 className="font-display text-2xl tracking-tight">Billing</h3>
          <p className="text-white/50 text-sm mt-2">Invoices &amp; payments.</p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm uppercase tracking-wider text-white/70 group-hover:text-white">Open <ArrowUpRight className="w-4 h-4" /></div>
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, total }) {
  return (
    <div className="bg-black p-6 md:p-8">
      <div className="text-xs uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="font-display text-5xl font-light tracking-tighter">{value}</span>
        <span className="text-white/30 text-sm font-mono">/ {total}</span>
      </div>
    </div>
  );
}
