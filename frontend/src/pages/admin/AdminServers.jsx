import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Server as ServerIcon, Trash2, ExternalLink, Lock, Sparkles, Search } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AdminServers() {
  const { user } = useAuth();
  const [servers, setServers] = useState([]);
  const [q, setQ] = useState("");
  const canDelete = ["admin", "engineer"].includes(user?.role);

  const fetch = () => api.get("/admin/servers").then(({ data }) => setServers(data)).catch(() => {});
  useEffect(() => { fetch(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this server (and remove from Pterodactyl)?")) return;
    try {
      await api.delete(`/admin/servers/${id}?force=true`);
      toast.success("Server deleted.");
      fetch();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Delete failed");
    }
  };

  const filtered = servers.filter((s) => {
    if (!q) return true;
    const v = q.toLowerCase();
    return (
      s.name?.toLowerCase().includes(v) ||
      s.user_email?.toLowerCase().includes(v) ||
      s.pterodactyl_identifier?.toLowerCase().includes(v) ||
      String(s.pterodactyl_server_id || "").includes(v)
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Admin / Servers</div>
          <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">All servers</h1>
          <p className="mt-2 text-white/50 text-sm max-w-xl">
            Every server across all users. <b>Staff &amp; engineers</b> can open any server for support.
            Only <b>engineers &amp; admins</b> can delete a server.
          </p>
        </div>
        <div className="flex items-center gap-2 border border-white/15 px-3 py-2">
          <Search className="w-4 h-4 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, id…" data-testid="admin-servers-search" className="bg-transparent outline-none text-sm w-64" />
        </div>
      </div>

      <div className="border border-white/10 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10">
              <th className="px-6 py-4">Server</th>
              <th className="px-6 py-4">Owner</th>
              <th className="px-6 py-4">Tier</th>
              <th className="px-6 py-4">Resources</th>
              <th className="px-6 py-4">Panel ID</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-white/40 text-sm">{servers.length === 0 ? "No servers yet." : "No matches."}</td></tr>
            ) : filtered.map((s) => (
              <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]" data-testid={`admin-server-row-${s.id}`}>
                <td className="px-6 py-4">
                  <div className="inline-flex items-center gap-2"><ServerIcon className="w-4 h-4 text-white/50" /> <span className="font-display">{s.name}</span></div>
                  <div className="text-xs text-white/40 font-mono mt-0.5">{s.pterodactyl_identifier || "—"}</div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div>{s.user_name || "—"}</div>
                  <div className="text-xs font-mono text-white/40">{s.user_email || "—"}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 inline-flex items-center gap-1 ${s.user_tier === "premium" ? "bg-white text-black" : "bg-white/10 text-white/70"}`}>
                    {s.user_tier === "premium" && <Sparkles className="w-3 h-3" />} {s.user_tier || "free"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-white/60 font-mono">{s.ram_gb}GB · {s.cpu_cores}c · {s.storage_gb}GB</td>
                <td className="px-6 py-4 text-sm text-white/40 font-mono">{s.pterodactyl_server_id || "—"}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Link to={`/dashboard/servers/${s.id}`} className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white/5 inline-flex items-center gap-1" data-testid={`admin-server-open-${s.id}`}>
                    Open <ExternalLink className="w-3 h-3" />
                  </Link>
                  {canDelete ? (
                    <button onClick={() => remove(s.id)} className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white/5 inline-flex items-center gap-1" data-testid={`admin-server-delete-${s.id}`}>
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  ) : (
                    <span title="Only engineers and admins can delete" className="text-xs uppercase tracking-wider border border-white/10 px-3 py-1.5 text-white/30 inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
