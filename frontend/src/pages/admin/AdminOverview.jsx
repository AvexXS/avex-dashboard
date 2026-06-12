import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Users, Server, Ticket, DollarSign, Activity } from "lucide-react";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-10">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Admin / Overview</div>
        <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Control room</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10">
        <Stat icon={Users} label="Users" value={stats?.users ?? 0} />
        <Stat icon={Server} label="Servers" value={stats?.total_servers ?? 0} sub={`${stats?.active_servers || 0} online`} />
        <Stat icon={Ticket} label="Open tickets" value={stats?.open_tickets ?? 0} sub={`${stats?.total_tickets || 0} total`} />
        <Stat icon={DollarSign} label="Revenue" value={`$${(stats?.total_revenue || 0).toFixed(0)}`} sub={`${stats?.paid_invoices || 0} paid`} />
      </div>

      <div className="grid md:grid-cols-2 gap-px bg-white/10 border border-white/10">
        <div className="bg-black p-8">
          <div className="text-xs uppercase tracking-widest text-white/40">Team</div>
          <div className="font-display text-5xl font-light tracking-tighter mt-3">{stats?.staff_count || 0}</div>
          <div className="text-sm text-white/50 mt-1">Admins, staff and engineers.</div>
        </div>
        <div className="bg-black p-8">
          <div className="text-xs uppercase tracking-widest text-white/40">Unpaid invoices</div>
          <div className="font-display text-5xl font-light tracking-tighter mt-3">{stats?.unpaid_invoices || 0}</div>
          <div className="text-sm text-white/50 mt-1">Pending payment.</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-black p-6">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-white/40">{label}</div>
        <Icon className="w-4 h-4 text-white/40" strokeWidth={1.5} />
      </div>
      <div className="mt-3 font-display text-4xl font-light tracking-tighter">{value ?? "—"}</div>
      {sub && <div className="text-xs text-white/40 font-mono mt-1">{sub}</div>}
    </div>
  );
}