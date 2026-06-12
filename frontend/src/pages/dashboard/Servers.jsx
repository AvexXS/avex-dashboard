import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Circle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const GAMES = [
  { id: "minecraft_java", label: "Minecraft (Java)" },
  { id: "minecraft_bedrock", label: "Minecraft (Bedrock)" },
  { id: "python", label: "Python" },
  { id: "nodejs", label: "Node.js" },
  { id: "other", label: "Other" },
];

export default function Servers() {
  const [servers, setServers] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [game, setGame] = useState("minecraft_java");
  const [loading, setLoading] = useState(false);

  const fetchServers = () => api.get("/servers").then(({ data }) => setServers(data)).catch(() => {});

  useEffect(() => { fetchServers(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/servers", { name, game });
      toast.success("Server created.");
      setOpen(false);
      setName("");
      fetchServers();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not create server.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this server? This cannot be undone.")) return;
    try {
      await api.delete(`/servers/${id}`);
      toast.success("Server deleted.");
      fetchServers();
    } catch {
      toast.error("Could not delete server.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Servers</div>
          <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Your servers</h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          data-testid="servers-create-btn"
          className="bg-white text-black px-6 py-3 text-sm uppercase tracking-wider font-medium hover:bg-white/90 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create server
        </button>
      </div>

      {servers.length === 0 ? (
        <div className="border border-white/10 p-12 text-center bg-[#0a0a0a]">
          <div className="font-display text-2xl tracking-tight">No servers yet</div>
          <p className="text-white/50 mt-2 text-sm">Spin up your first one in 60 seconds.</p>
        </div>
      ) : (
        <div className="border border-white/10 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Game</th>
                <th className="px-6 py-4">Resources</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {servers.map((s) => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]" data-testid={`server-row-${s.id}`}>
                  <td className="px-6 py-4">
                    <Link to={`/dashboard/servers/${s.id}`} className="font-display text-lg hover:underline">{s.name}</Link>
                    <div className="text-xs text-white/40 font-mono mt-0.5">{s.ip}:{s.port}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/60">{GAMES.find((g) => g.id === s.game)?.label || s.game}</td>
                  <td className="px-6 py-4 text-sm text-white/60 font-mono">{s.ram_gb}GB · {s.cpu_cores}c · {s.storage_gb}GB</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Circle className={`w-2.5 h-2.5 ${s.status === "online" ? "fill-white text-white" : "fill-white/20 text-white/20"}`} />
                      <span className="uppercase tracking-wider text-xs">{s.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/dashboard/servers/${s.id}`} className="text-xs uppercase tracking-wider text-white/70 hover:text-white border border-white/15 px-3 py-1.5 mr-2" data-testid={`server-manage-${s.id}`}>
                      Manage
                    </Link>
                    <button onClick={() => remove(s.id)} className="text-white/50 hover:text-white p-2 inline-flex" data-testid={`server-delete-${s.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={create} className="w-full max-w-lg border border-white/15 bg-black p-8">
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ New server</div>
            <h2 className="font-display text-3xl mt-2 tracking-tight">Create a server</h2>
            <div className="mt-8 space-y-6">
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40">Name</label>
                <input
                  required value={name} onChange={(e) => setName(e.target.value)} placeholder="my-cool-server"
                  data-testid="server-create-name"
                  className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40">Game / Runtime</label>
                <select value={game} onChange={(e) => setGame(e.target.value)} data-testid="server-create-game" className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none">
                  {GAMES.map((g) => (<option key={g.id} value={g.id} className="bg-black">{g.label}</option>))}
                </select>
              </div>
              <div className="text-xs text-white/40 font-mono">2 GB RAM · 1 CPU · 5 GB storage (Free tier)</div>
            </div>
            <div className="mt-8 flex gap-3 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-5 py-3 text-sm uppercase tracking-wider border border-white/20 hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={loading} data-testid="server-create-submit" className="bg-white text-black px-6 py-3 text-sm uppercase tracking-wider hover:bg-white/90 disabled:opacity-50">{loading ? "Creating..." : "Create"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
