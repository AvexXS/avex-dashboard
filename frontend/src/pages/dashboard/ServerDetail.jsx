import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Play, Square, RotateCw, Skull, Cpu, MemoryStick, HardDrive, Users, Send, Search, Package, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const TAB_LABELS = [
  { id: "console", label: "Console" },
  { id: "plugins", label: "Plugins" },
  { id: "files", label: "Files" },
  { id: "settings", label: "Settings" },
];

export default function ServerDetail() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState(null);
  const [stats, setStats] = useState({ cpu_pct: 0, ram_mb: 0, ram_max_mb: 0, disk_mb: 0, disk_max_mb: 0, players_online: 0, players_max: 0, uptime_s: 0 });
  const [tab, setTab] = useState("console");
  const [consoleLines, setConsoleLines] = useState([]);
  const [cmd, setCmd] = useState("");
  const consoleEndRef = useRef(null);
  const [catalog, setCatalog] = useState([]);
  const [installed, setInstalled] = useState([]);
  const [search, setSearch] = useState("");

  const fetchServer = () => api.get(`/servers/${serverId}`).then(({ data }) => setServer(data));
  const fetchStats = () => api.get(`/servers/${serverId}/stats`).then(({ data }) => setStats(data));
  const fetchConsole = () => api.get(`/servers/${serverId}/console`).then(({ data }) => setConsoleLines(data.lines));
  const fetchPlugins = () => Promise.all([
    api.get(`/servers/${serverId}/plugins/catalog`),
    api.get(`/servers/${serverId}/plugins/installed`),
  ]).then(([a, b]) => { setCatalog(a.data.plugins); setInstalled(b.data.installed); });

  useEffect(() => {
    fetchServer();
    fetchPlugins();
    const i1 = setInterval(fetchStats, 3000);
    const i2 = setInterval(fetchConsole, 3000);
    fetchStats();
    fetchConsole();
    return () => { clearInterval(i1); clearInterval(i2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLines]);

  if (!server) return <div className="text-white/40 font-mono text-sm">loading…</div>;

  const isMinecraft = server.game?.startsWith("minecraft");
  const power = async (action) => {
    try {
      await api.post(`/servers/${serverId}/power?action=${action}`);
      toast.success(`${action} requested`);
      setTimeout(() => { fetchServer(); fetchConsole(); }, 1200);
    } catch {
      toast.error("Action failed");
    }
  };

  const sendCmd = async (e) => {
    e.preventDefault();
    if (!cmd.trim()) return;
    try {
      const { data } = await api.post(`/servers/${serverId}/console`, { command: cmd });
      setConsoleLines(data.lines || []);
      setCmd("");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Command failed");
    }
  };

  const installPlugin = async (p) => {
    try {
      await api.post(`/servers/${serverId}/plugins/install`, { plugin_slug: p.slug, plugin_name: p.name });
      toast.success(`${p.name} installed`);
      fetchPlugins();
    } catch { toast.error("Install failed"); }
  };
  const uninstallPlugin = async (p) => {
    try {
      await api.post(`/servers/${serverId}/plugins/uninstall`, { plugin_slug: p.slug, plugin_name: p.name });
      toast.success(`${p.name} removed`);
      fetchPlugins();
    } catch { toast.error("Uninstall failed"); }
  };

  const removeServer = async () => {
    if (!window.confirm("Delete this server?")) return;
    await api.delete(`/servers/${serverId}`);
    navigate("/dashboard/servers");
  };

  const filteredCatalog = catalog.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <Link to="/dashboard/servers" className="text-xs uppercase tracking-widest text-white/40 hover:text-white inline-flex items-center gap-2" data-testid="server-back-link">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to servers
        </Link>
        <div className="mt-3 flex flex-col md:flex-row md:items-end gap-4 md:justify-between">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter">{server.name}</h1>
            <div className="text-sm text-white/40 font-mono mt-1">{server.ip}:{server.port} · <span className={server.status === "online" ? "text-white" : ""}>{server.status}</span></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PowerBtn icon={Play} label="Start" onClick={() => power("start")} disabled={server.status === "online"} testid="power-start" />
            <PowerBtn icon={RotateCw} label="Restart" onClick={() => power("restart")} disabled={server.status === "offline"} testid="power-restart" />
            <PowerBtn icon={Square} label="Stop" onClick={() => power("stop")} disabled={server.status !== "online"} testid="power-stop" />
            <PowerBtn icon={Skull} label="Kill" onClick={() => power("kill")} testid="power-kill" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10">
        <StatTile icon={Cpu} label="CPU" value={`${stats.cpu_pct}%`} sub="usage" />
        <StatTile icon={MemoryStick} label="RAM" value={`${(stats.ram_mb / 1024).toFixed(1)}`} sub={`/ ${(stats.ram_max_mb / 1024).toFixed(0)} GB`} />
        <StatTile icon={HardDrive} label="Disk" value={`${(stats.disk_mb / 1024).toFixed(1)}`} sub={`/ ${(stats.disk_max_mb / 1024).toFixed(0)} GB`} />
        <StatTile icon={Users} label="Players" value={`${stats.players_online}`} sub={`/ ${stats.players_max}`} />
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 flex gap-6">
        {TAB_LABELS.filter((t) => t.id !== "plugins" || isMinecraft).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`server-tab-${t.id}`}
            className={`pb-3 text-sm uppercase tracking-wider border-b-2 -mb-px transition-colors ${tab === t.id ? "border-white text-white" : "border-transparent text-white/40 hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "console" && (
        <div className="space-y-3">
          <div className="bg-[#050505] border border-white/10 p-4 font-mono text-sm text-white/80 h-96 overflow-y-auto" data-testid="server-console">
            {consoleLines.map((l, i) => (
              <div key={i} className="leading-relaxed">{l}</div>
            ))}
            <div ref={consoleEndRef} />
          </div>
          <form onSubmit={sendCmd} className="flex gap-2">
            <span className="text-white/40 font-mono py-3">$</span>
            <input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder={server.status === "online" ? "Type a command…" : "Start server to enter commands"}
              disabled={server.status !== "online"}
              data-testid="server-console-input"
              className="flex-1 bg-transparent border-b border-white/20 focus:border-white py-3 outline-none font-mono text-sm disabled:opacity-50"
            />
            <button type="submit" disabled={server.status !== "online"} data-testid="server-console-send" className="bg-white text-black px-4 text-sm uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-2">
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </form>
        </div>
      )}

      {tab === "plugins" && isMinecraft && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plugins…"
              data-testid="plugin-search"
              className="flex-1 bg-transparent border-b border-white/20 focus:border-white py-2 outline-none"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-px bg-white/10 border border-white/10">
            {filteredCatalog.map((p) => {
              const isInstalled = installed.some((i) => i.slug === p.slug);
              return (
                <div key={p.slug} className="bg-black p-6 flex items-start gap-4" data-testid={`plugin-${p.slug}`}>
                  <Package className="w-6 h-6 text-white/60 mt-1" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg">{p.name}</div>
                    <div className="text-xs text-white/40 uppercase tracking-widest mt-0.5">{p.category} · {p.downloads} downloads</div>
                    <div className="text-sm text-white/60 mt-2">{p.description}</div>
                  </div>
                  {isInstalled ? (
                    <button onClick={() => uninstallPlugin(p)} data-testid={`plugin-remove-${p.slug}`} className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white/5 inline-flex items-center gap-1">
                      <Check className="w-3 h-3" /> Installed
                    </button>
                  ) : (
                    <button onClick={() => installPlugin(p)} data-testid={`plugin-install-${p.slug}`} className="text-xs uppercase tracking-wider bg-white text-black px-3 py-1.5 hover:bg-white/90">
                      Install
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "files" && (
        <div className="border border-white/10 bg-[#0a0a0a] p-8 text-center">
          <div className="font-display text-2xl">File Manager</div>
          <p className="text-white/50 text-sm mt-2">File browser is on the roadmap. Coming in v1.1.</p>
        </div>
      )}

      {tab === "settings" && (
        <div className="border border-white/10 p-8 bg-[#0a0a0a] space-y-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40">Server ID</div>
            <div className="font-mono text-sm mt-1">{server.id}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40">Address</div>
            <div className="font-mono text-sm mt-1">{server.ip}:{server.port}</div>
          </div>
          <div className="pt-4 border-t border-white/10">
            <button onClick={removeServer} data-testid="server-delete-btn" className="border border-white/20 text-white px-4 py-2 text-sm uppercase tracking-wider hover:bg-white/5 inline-flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Delete server
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-black p-6">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-white/40">{label}</div>
        <Icon className="w-4 h-4 text-white/40" strokeWidth={1.5} />
      </div>
      <div className="mt-3 font-display text-3xl font-light tracking-tighter">{value}</div>
      <div className="text-xs text-white/40 font-mono mt-1">{sub}</div>
    </div>
  );
}

function PowerBtn({ icon: Icon, label, onClick, disabled, testid }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      className="border border-white/15 px-4 py-2 text-xs uppercase tracking-wider hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-2"
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}
