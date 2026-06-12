import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Play, Square, RotateCw, Skull, Cpu, MemoryStick, HardDrive, Users,
  Send, Folder, File as FileIcon, Database, Save, Trash2, ChevronRight, Plus,
  Download, Edit2, Clock, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const TABS = [
  { id: "console", label: "Console" },
  { id: "files", label: "Files" },
  { id: "databases", label: "Databases" },
  { id: "backups", label: "Backups" },
  { id: "schedules", label: "Schedules" },
  { id: "settings", label: "Settings" },
];

export default function ServerDetail() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState(null);
  const [stats, setStats] = useState({ cpu_pct: 0, ram_mb: 0, ram_max_mb: 0, disk_mb: 0, disk_max_mb: 0, state: "unknown", network_rx: 0, network_tx: 0, uptime_s: 0 });
  const [tab, setTab] = useState("console");
  const [error, setError] = useState("");

  // Console
  const wsRef = useRef(null);
  const [consoleLines, setConsoleLines] = useState([]);
  const [cmd, setCmd] = useState("");
  const consoleEndRef = useRef(null);

  const fetchServer = async () => {
    try {
      const { data } = await api.get(`/servers/${serverId}`);
      setServer(data);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load server");
    }
  };
  const fetchStats = async () => {
    try {
      const { data } = await api.get(`/servers/${serverId}/stats`);
      setStats(data);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    fetchServer();
    const i = setInterval(fetchStats, 2500);
    fetchStats();
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  // Console WebSocket
  useEffect(() => {
    if (tab !== "console" || !server?.pterodactyl_identifier) return;
    let alive = true;
    const start = async () => {
      try {
        const { data } = await api.get(`/servers/${serverId}/websocket`);
        if (!alive) return;
        const ws = new WebSocket(data.socket);
        wsRef.current = ws;
        ws.onopen = () => {
          ws.send(JSON.stringify({ event: "auth", args: [data.token] }));
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.event === "console output") {
              setConsoleLines((ls) => [...ls.slice(-300), ...msg.args]);
            } else if (msg.event === "auth success") {
              ws.send(JSON.stringify({ event: "send logs", args: [null] }));
            } else if (msg.event === "token expiring") {
              api.get(`/servers/${serverId}/websocket`).then(({ data: d2 }) => {
                ws.send(JSON.stringify({ event: "auth", args: [d2.token] }));
              });
            }
          } catch {}
        };
        ws.onerror = () => setConsoleLines((ls) => [...ls, "[avex] websocket error — falling back to polling"]);
      } catch (e) {
        setConsoleLines((ls) => [...ls, `[avex] could not open console: ${e?.response?.data?.detail || e.message}`]);
      }
    };
    start();
    return () => { alive = false; wsRef.current?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, server?.pterodactyl_identifier, serverId]);

  useEffect(() => { consoleEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [consoleLines]);

  if (error) return (
    <div className="space-y-6">
      <Link to="/dashboard/servers" className="text-xs uppercase tracking-widest text-white/40 hover:text-white inline-flex items-center gap-2"><ArrowLeft className="w-3.5 h-3.5" /> Back</Link>
      <div className="border border-white/20 bg-white/5 p-6 inline-flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5" />
        <div>
          <div className="text-sm">{error}</div>
          <div className="text-xs text-white/50 mt-1">Make sure Pterodactyl is configured and the server still exists on the panel.</div>
        </div>
      </div>
    </div>
  );
  if (!server) return <div className="text-white/40 font-mono text-sm">loading…</div>;

  const power = async (action) => {
    try {
      await api.post(`/servers/${serverId}/power?action=${action}`);
      toast.success(`${action} requested`);
      fetchStats();
    } catch (e) { toast.error(e?.response?.data?.detail || "Action failed"); }
  };

  const sendCmd = async (e) => {
    e.preventDefault();
    if (!cmd.trim()) return;
    try {
      await api.post(`/servers/${serverId}/console`, { command: cmd });
      // websocket will echo the output
      setCmd("");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Command failed");
    }
  };

  const removeServer = async () => {
    if (!window.confirm("Delete this server? It will be removed from the panel too.")) return;
    await api.delete(`/servers/${serverId}`);
    navigate("/dashboard/servers");
  };

  const state = stats.state || "unknown";
  const isOnline = state === "running";

  return (
    <div className="space-y-8">
      <div>
        <Link to="/dashboard/servers" className="text-xs uppercase tracking-widest text-white/40 hover:text-white inline-flex items-center gap-2" data-testid="server-back-link">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to servers
        </Link>
        <div className="mt-3 flex flex-col md:flex-row md:items-end gap-4 md:justify-between">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter">{server.name}</h1>
            <div className="text-sm text-white/40 font-mono mt-1">
              {server.pterodactyl_identifier ? `id ${server.pterodactyl_identifier}` : "no panel id"} · state <span className={isOnline ? "text-white" : ""}>{state}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PowerBtn icon={Play} label="Start" onClick={() => power("start")} disabled={isOnline} testid="power-start" />
            <PowerBtn icon={RotateCw} label="Restart" onClick={() => power("restart")} disabled={!isOnline} testid="power-restart" />
            <PowerBtn icon={Square} label="Stop" onClick={() => power("stop")} disabled={!isOnline} testid="power-stop" />
            <PowerBtn icon={Skull} label="Kill" onClick={() => power("kill")} testid="power-kill" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10">
        <StatTile icon={Cpu} label="CPU" value={`${stats.cpu_pct?.toFixed?.(1) || stats.cpu_pct}%`} sub="usage" />
        <StatTile icon={MemoryStick} label="RAM" value={`${(stats.ram_mb / 1024).toFixed(1)}`} sub={`/ ${(stats.ram_max_mb / 1024).toFixed(0)} GB`} />
        <StatTile icon={HardDrive} label="Disk" value={`${(stats.disk_mb / 1024).toFixed(1)}`} sub={`/ ${(stats.disk_max_mb / 1024).toFixed(0)} GB`} />
        <StatTile icon={Users} label="Uptime" value={`${Math.floor((stats.uptime_s || 0) / 60)}m`} sub={state} />
      </div>

      <div className="border-b border-white/10 flex gap-6 flex-wrap">
        {TABS.map((t) => (
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
          <div className="bg-[#050505] border border-white/10 p-4 font-mono text-sm text-white/80 h-96 overflow-y-auto whitespace-pre-wrap" data-testid="server-console">
            {consoleLines.length === 0 ? <span className="text-white/30">// waiting for output…</span> : consoleLines.map((l, i) => <div key={i} className="leading-relaxed">{l}</div>)}
            <div ref={consoleEndRef} />
          </div>
          <form onSubmit={sendCmd} className="flex gap-2">
            <span className="text-white/40 font-mono py-3">$</span>
            <input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder={isOnline ? "Type a command…" : "Start server to enter commands"}
              disabled={!isOnline}
              data-testid="server-console-input"
              className="flex-1 bg-transparent border-b border-white/20 focus:border-white py-3 outline-none font-mono text-sm disabled:opacity-50"
            />
            <button type="submit" disabled={!isOnline} data-testid="server-console-send" className="bg-white text-black px-4 text-sm uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-2">
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </form>
        </div>
      )}

      {tab === "files" && <FilesPanel serverId={serverId} identifier={server.pterodactyl_identifier} />}
      {tab === "databases" && <DatabasesPanel serverId={serverId} />}
      {tab === "backups" && <BackupsPanel serverId={serverId} />}
      {tab === "schedules" && <SchedulesPanel serverId={serverId} />}

      {tab === "settings" && (
        <div className="border border-white/10 p-8 bg-[#0a0a0a] space-y-6">
          <Field label="Avex Server ID" value={server.id} mono />
          <Field label="Pterodactyl Identifier" value={server.pterodactyl_identifier || "—"} mono />
          <Field label="Pterodactyl Server ID" value={server.pterodactyl_server_id || "—"} mono />
          <Field label="Resources" value={`${server.ram_gb} GB RAM · ${server.cpu_cores} CPU · ${server.storage_gb} GB`} mono />
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
    <button onClick={onClick} disabled={disabled} data-testid={testid}
      className="border border-white/15 px-4 py-2 text-xs uppercase tracking-wider hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-2">
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}
function Field({ label, value, mono }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-white/40">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono text-sm" : "text-base"}`}>{value}</div>
    </div>
  );
}

// ============== Files ==============
function FilesPanel({ serverId, identifier }) {
  const [path, setPath] = useState("/");
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // { name, content }
  const [loading, setLoading] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/servers/${serverId}/files`, { params: { directory: path } });
      const arr = (data.data || []).map((f) => f.attributes);
      setItems(arr);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "List failed");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (identifier) fetchList(); /* eslint-disable-next-line */ }, [path, identifier]);

  const goInto = (name) => setPath(joinPath(path, name));
  const goUp = () => { if (path === "/") return; const p = path.replace(/\/+$/, ""); setPath(p.substring(0, p.lastIndexOf("/")) || "/"); };

  const openFile = async (name) => {
    try {
      const file = joinPath(path, name);
      const { data } = await api.get(`/servers/${serverId}/files/contents`, { params: { file } });
      setEditing({ name: file, content: data.content });
    } catch (e) { toast.error(e?.response?.data?.detail || "Open failed"); }
  };
  const saveFile = async () => {
    try {
      await api.post(`/servers/${serverId}/files/write`, { path: editing.name, content: editing.content });
      toast.success("Saved.");
      setEditing(null);
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  const newFolder = async () => {
    const name = window.prompt("Folder name?");
    if (!name) return;
    try {
      await api.post(`/servers/${serverId}/files/create-folder`, { root: path, name });
      fetchList();
    } catch (e) { toast.error(e?.response?.data?.detail || "Mkdir failed"); }
  };

  const removeItem = async (name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await api.post(`/servers/${serverId}/files/delete`, { root: path, files: [name] });
      fetchList();
    } catch (e) { toast.error(e?.response?.data?.detail || "Delete failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-sm font-mono text-white/60">
          <button onClick={() => setPath("/")} className="hover:text-white">~</button>
          {path.split("/").filter(Boolean).map((part, i, arr) => (
            <React.Fragment key={i}>
              <ChevronRight className="w-3 h-3 text-white/30" />
              <button onClick={() => setPath("/" + arr.slice(0, i + 1).join("/"))} className="hover:text-white">{part}</button>
            </React.Fragment>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={goUp} disabled={path === "/"} className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white/5 disabled:opacity-30">Up</button>
          <button onClick={newFolder} data-testid="files-mkdir-btn" className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white/5 inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Folder</button>
        </div>
      </div>

      <div className="border border-white/10">
        {loading ? <div className="p-6 text-white/40 text-sm">Loading…</div> :
          items.length === 0 ? <div className="p-6 text-white/40 text-sm">Empty directory.</div> :
          items.map((it) => (
            <div key={it.name} className="px-4 py-2 border-b border-white/5 last:border-b-0 flex items-center justify-between hover:bg-white/[0.02]">
              <button onClick={() => it.is_file ? openFile(it.name) : goInto(it.name)} className="flex-1 flex items-center gap-3 text-left">
                {it.is_file ? <FileIcon className="w-4 h-4 text-white/50" /> : <Folder className="w-4 h-4 text-white" />}
                <span className="text-sm">{it.name}</span>
              </button>
              <div className="text-xs font-mono text-white/40 mr-3">{it.is_file ? `${Math.round(it.size / 1024)} KB` : "—"}</div>
              <button onClick={() => removeItem(it.name)} className="text-white/30 hover:text-white p-1"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={() => setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl border border-white/15 bg-black p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-sm truncate">{editing.name}</div>
              <button onClick={() => setEditing(null)} className="text-white/40 hover:text-white text-xs uppercase tracking-wider">Close</button>
            </div>
            <textarea
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              className="flex-1 min-h-[60vh] bg-[#050505] border border-white/10 p-4 font-mono text-xs outline-none focus:border-white/30"
            />
            <div className="mt-3 flex gap-2 justify-end">
              <button onClick={() => setEditing(null)} className="border border-white/20 px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/5">Cancel</button>
              <button onClick={saveFile} data-testid="files-save-btn" className="bg-white text-black px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/90 inline-flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function joinPath(base, name) {
  if (base === "/") return "/" + name;
  return base.replace(/\/+$/, "") + "/" + name;
}

// ============== Databases ==============
function DatabasesPanel({ serverId }) {
  const [dbs, setDbs] = useState([]);
  const [name, setName] = useState("");
  const fetchDbs = () => api.get(`/servers/${serverId}/databases`).then(({ data }) => setDbs(data.data || [])).catch((e) => toast.error(e?.response?.data?.detail || "Load failed"));
  useEffect(() => { fetchDbs(); /* eslint-disable-next-line */ }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/servers/${serverId}/databases`, { name });
      toast.success("Database created.");
      setName(""); fetchDbs();
    } catch (e) { toast.error(e?.response?.data?.detail || "Create failed"); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete database?")) return;
    try { await api.delete(`/servers/${serverId}/databases/${id}`); fetchDbs(); } catch (e) { toast.error(e?.response?.data?.detail || "Delete failed"); }
  };
  const rotate = async (id) => {
    try { await api.post(`/servers/${serverId}/databases/${id}/rotate`); fetchDbs(); toast.success("Password rotated"); } catch (e) { toast.error(e?.response?.data?.detail || "Rotate failed"); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex gap-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="db_name" data-testid="db-name-input" className="flex-1 bg-transparent border-b border-white/20 focus:border-white py-3 outline-none font-mono text-sm" />
        <button type="submit" data-testid="db-create-btn" className="bg-white text-black px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/90 inline-flex items-center gap-2"><Plus className="w-3.5 h-3.5" /> Create database</button>
      </form>
      <div className="border border-white/10">
        {dbs.length === 0 ? <div className="p-6 text-white/40 text-sm">No databases yet.</div> :
          dbs.map((d) => {
            const a = d.attributes || {};
            const host = a.host || {};
            return (
              <div key={a.id} className="p-4 border-b border-white/5 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2"><Database className="w-4 h-4 text-white/50" /> <span className="font-mono">{a.name}</span></div>
                  <div className="space-x-2">
                    <button onClick={() => rotate(a.id)} className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white/5">Rotate password</button>
                    <button onClick={() => remove(a.id)} className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white/5 inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
                  </div>
                </div>
                <div className="text-xs font-mono text-white/50 mt-2 grid md:grid-cols-2 gap-1">
                  <div>host: {host.address || "—"}:{host.port || "—"}</div>
                  <div>user: {a.username}</div>
                  <div className="md:col-span-2 break-all">connection: {a.connections_from || "%"}</div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ============== Backups ==============
function BackupsPanel({ serverId }) {
  const [backups, setBackups] = useState([]);
  const [name, setName] = useState("");
  const fetchAll = () => api.get(`/servers/${serverId}/backups`).then(({ data }) => setBackups(data.data || [])).catch((e) => toast.error(e?.response?.data?.detail || "Load failed"));
  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, []);

  const create = async (e) => {
    e.preventDefault();
    try { await api.post(`/servers/${serverId}/backups`, { name: name || `backup-${Date.now()}` }); toast.success("Backup queued"); setName(""); fetchAll(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Backup failed"); }
  };
  const restore = async (uuid) => {
    if (!window.confirm("Restore this backup? Server data will be replaced.")) return;
    try { await api.post(`/servers/${serverId}/backups/${uuid}/restore`); toast.success("Restore started"); } catch (e) { toast.error(e?.response?.data?.detail || "Restore failed"); }
  };
  const remove = async (uuid) => {
    if (!window.confirm("Delete backup?")) return;
    try { await api.delete(`/servers/${serverId}/backups/${uuid}`); fetchAll(); } catch (e) { toast.error(e?.response?.data?.detail || "Delete failed"); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Backup name (optional)" data-testid="backup-name-input" className="flex-1 bg-transparent border-b border-white/20 focus:border-white py-3 outline-none font-mono text-sm" />
        <button type="submit" data-testid="backup-create-btn" className="bg-white text-black px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/90 inline-flex items-center gap-2"><Plus className="w-3.5 h-3.5" /> Create backup</button>
      </form>
      <div className="border border-white/10">
        {backups.length === 0 ? <div className="p-6 text-white/40 text-sm">No backups yet.</div> :
          backups.map((b) => {
            const a = b.attributes || {};
            return (
              <div key={a.uuid} className="p-4 border-b border-white/5 last:border-b-0 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-sm">{a.name}</div>
                  <div className="text-xs text-white/40 font-mono mt-0.5">{a.uuid?.slice(0, 8)} · {a.is_successful ? "complete" : "in progress"} · {a.bytes ? `${Math.round(a.bytes / 1024 / 1024)} MB` : "—"} · {new Date(a.created_at).toLocaleString()}</div>
                </div>
                <div className="space-x-2">
                  <button onClick={() => restore(a.uuid)} className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white/5">Restore</button>
                  <button onClick={() => remove(a.uuid)} className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white/5 inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ============== Schedules ==============
function SchedulesPanel({ serverId }) {
  const [schedules, setSchedules] = useState([]);
  const [form, setForm] = useState({ name: "Daily restart", cron: "0 4 * * *", enabled: true });
  const fetchAll = () => api.get(`/servers/${serverId}/schedules`).then(({ data }) => setSchedules(data.data || [])).catch((e) => toast.error(e?.response?.data?.detail || "Load failed"));
  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, []);

  const create = async (e) => {
    e.preventDefault();
    try { await api.post(`/servers/${serverId}/schedules`, form); toast.success("Schedule created"); fetchAll(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Create failed"); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete schedule?")) return;
    try { await api.delete(`/servers/${serverId}/schedules/${id}`); fetchAll(); } catch (e) { toast.error(e?.response?.data?.detail || "Delete failed"); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="border border-white/10 p-5 grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="text-xs uppercase tracking-widest text-white/40">Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="schedule-name" className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-2 outline-none" />
        </div>
        <div className="md:col-span-1">
          <label className="text-xs uppercase tracking-widest text-white/40">Cron expression</label>
          <input required value={form.cron} onChange={(e) => setForm({ ...form, cron: e.target.value })} data-testid="schedule-cron" className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-2 outline-none font-mono text-sm" />
          <div className="mt-1 text-[10px] font-mono text-white/40">min hour dom mon dow</div>
        </div>
        <div className="md:col-span-1 flex items-end">
          <button type="submit" data-testid="schedule-create-btn" className="bg-white text-black px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/90 inline-flex items-center gap-2"><Plus className="w-3.5 h-3.5" /> Create</button>
        </div>
      </form>
      <div className="border border-white/10">
        {schedules.length === 0 ? <div className="p-6 text-white/40 text-sm">No schedules yet.</div> :
          schedules.map((s) => {
            const a = s.attributes || {};
            const cronStr = `${a.cron?.minute || "*"} ${a.cron?.hour || "*"} ${a.cron?.day_of_month || "*"} ${a.cron?.month || "*"} ${a.cron?.day_of_week || "*"}`;
            return (
              <div key={a.id} className="p-4 border-b border-white/5 last:border-b-0 flex items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2"><Clock className="w-4 h-4 text-white/50" /> <span>{a.name}</span></div>
                  <div className="text-xs text-white/40 font-mono mt-0.5">{cronStr} · {a.is_active ? "active" : "paused"}</div>
                </div>
                <button onClick={() => remove(a.id)} className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white/5 inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
