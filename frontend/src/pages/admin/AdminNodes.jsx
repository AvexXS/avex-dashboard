import React, { useEffect, useState } from "react";
import { RefreshCw, Server as ServerIcon, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function AdminNodes() {
  const [status, setStatus] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [nests, setNests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const s = await api.get("/pterodactyl/status");
      setStatus(s.data);
      if (s.data.configured && s.data.reachable) {
        try {
          const [n, nn] = await Promise.all([
            api.get("/admin/pterodactyl/nodes"),
            api.get("/admin/pterodactyl/nests"),
          ]);
          setNodes(n.data);
          setNests(nn.data);
        } catch (e) {
          toast.error("Failed to fetch from Pterodactyl: " + (e?.response?.data?.detail || e.message));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Admin / Infrastructure</div>
          <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Pterodactyl panel</h1>
          <p className="mt-2 text-white/50 text-sm max-w-xl">Live view of the connected Pterodactyl panel. Manage nodes, allocations, nests &amp; eggs directly on the panel — Avex reflects them in real-time.</p>
        </div>
        <button onClick={fetchAll} data-testid="ptero-refresh" className="border border-white/15 px-5 py-3 text-sm uppercase tracking-wider hover:bg-white/5 inline-flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Status card */}
      <div className="border border-white/10 p-6 bg-[#0a0a0a] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {status?.reachable ? (
            <CheckCircle2 className="w-6 h-6 text-white" />
          ) : (
            <XCircle className="w-6 h-6 text-white/40" />
          )}
          <div>
            <div className="text-sm">
              {status === null ? "Checking…" :
                !status.configured ? "Pterodactyl not configured." :
                status.reachable ? "Connected and reachable." :
                "Configured but unreachable."}
            </div>
            <div className="text-xs text-white/40 font-mono mt-1">
              {status?.url || "—"} {status?.client_key_set ? " · Client API key SET" : " · Client API key MISSING"}
            </div>
            {status?.error && <div className="text-xs text-white/60 mt-1">{status.error}</div>}
          </div>
        </div>
        <a href="/admin/settings" className="text-xs uppercase tracking-wider border border-white/15 px-4 py-2 hover:bg-white/5 inline-flex items-center gap-1">
          Edit settings <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Nodes */}
      <section>
        <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Nodes</div>
        {nodes.length === 0 ? (
          <div className="border border-white/10 p-10 text-center text-white/40 text-sm bg-[#0a0a0a]">
            {status?.reachable ? "No nodes found on the panel." : "Connect Pterodactyl to see nodes."}
          </div>
        ) : (
          <div className="border border-white/10 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">FQDN</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Memory</th>
                  <th className="px-6 py-4">Disk</th>
                  <th className="px-6 py-4">Public</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((n) => (
                  <tr key={n.id} className="border-b border-white/5" data-testid={`node-row-${n.id}`}>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2"><ServerIcon className="w-4 h-4 text-white/50" /> {n.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-white/70">{n.fqdn}</td>
                    <td className="px-6 py-4 text-sm text-white/60">{n.location}</td>
                    <td className="px-6 py-4 text-sm font-mono">{n.memory} MB</td>
                    <td className="px-6 py-4 text-sm font-mono">{n.disk} MB</td>
                    <td className="px-6 py-4 text-xs uppercase tracking-wider">{n.public ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Nests & Eggs */}
      <section>
        <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Nests &amp; Eggs</div>
        {nests.length === 0 ? (
          <div className="border border-white/10 p-10 text-center text-white/40 text-sm bg-[#0a0a0a]">
            {status?.reachable ? "No nests configured on the panel." : "Connect Pterodactyl to see nests &amp; eggs."}
          </div>
        ) : (
          <div className="space-y-4">
            {nests.map((nest) => (
              <div key={nest.id} className="border border-white/10 bg-[#0a0a0a]" data-testid={`nest-${nest.id}`}>
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-display text-lg">{nest.name}</div>
                    <div className="text-xs text-white/40">{nest.description} · ID {nest.id}</div>
                  </div>
                  <div className="text-xs uppercase tracking-wider text-white/40">{nest.eggs?.length || 0} eggs</div>
                </div>
                <div className="grid md:grid-cols-2 gap-px bg-white/10">
                  {(nest.eggs || []).map((egg) => (
                    <div key={egg.id} className="bg-black p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-sm">{egg.name}</div>
                        <div className="text-[10px] uppercase tracking-widest bg-white/10 px-2 py-0.5 font-mono">EGG-{egg.id}</div>
                      </div>
                      <div className="text-xs text-white/40 mt-1 truncate">{egg.docker_image}</div>
                      {egg.description && <div className="text-xs text-white/50 mt-2 line-clamp-2">{egg.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
