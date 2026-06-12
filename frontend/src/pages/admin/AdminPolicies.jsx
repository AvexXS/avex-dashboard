import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Save, X, Box, Server as ServerIcon, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const ICONS = ["minecraft", "python", "nodejs", "rust", "discord", "generic"];

export default function AdminPolicies() {
  const [tab, setTab] = useState("eggs");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Admin / Access policies</div>
        <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Tier access</h1>
        <p className="mt-2 text-white/50 text-sm max-w-xl">Choose which eggs (games) and nodes free vs premium users can spin up. Engineers and admins can edit these.</p>
      </div>

      <div className="border-b border-white/10 flex gap-6">
        <TabBtn active={tab === "eggs"} onClick={() => setTab("eggs")} testid="policies-tab-eggs">Eggs</TabBtn>
        <TabBtn active={tab === "nodes"} onClick={() => setTab("nodes")} testid="policies-tab-nodes">Nodes</TabBtn>
      </div>

      {tab === "eggs" ? <EggPoliciesPanel /> : <NodePoliciesPanel />}
    </div>
  );
}

function TabBtn({ active, onClick, children, testid }) {
  return (
    <button onClick={onClick} data-testid={testid} className={`pb-3 text-sm uppercase tracking-wider border-b-2 -mb-px transition-colors ${active ? "border-white text-white" : "border-transparent text-white/40 hover:text-white"}`}>
      {children}
    </button>
  );
}

// =================== Egg policies ===================
function EggPoliciesPanel() {
  const [policies, setPolicies] = useState([]);
  const [nests, setNests] = useState([]);
  const [editing, setEditing] = useState(null);
  const [pteroOk, setPteroOk] = useState(true);

  const empty = { nest_id: "", egg_id: "", display_name: "", description: "", icon: "minecraft", allowed_tiers: ["free", "premium"], default_ram_mb: 2048, default_cpu_pct: 100, default_disk_mb: 5120, sort_order: 0, active: true };

  const fetchAll = async () => {
    try {
      const [p, n] = await Promise.all([api.get("/admin/egg-policies"), api.get("/admin/pterodactyl/nests").catch(() => ({ data: [] }))]);
      setPolicies(p.data);
      setNests(n.data);
      setPteroOk((n.data || []).length > 0);
    } catch (e) { toast.error("Load failed"); }
  };

  useEffect(() => { fetchAll(); }, []);

  const startCreate = () => setEditing({ ...empty, _new: true });
  const startEdit = (p) => setEditing({ ...p, _new: false });
  const cancel = () => setEditing(null);

  const save = async () => {
    const body = {
      ...editing,
      nest_id: parseInt(editing.nest_id),
      egg_id: parseInt(editing.egg_id),
      default_ram_mb: parseInt(editing.default_ram_mb),
      default_cpu_pct: parseInt(editing.default_cpu_pct),
      default_disk_mb: parseInt(editing.default_disk_mb),
      sort_order: parseInt(editing.sort_order || 0),
    };
    delete body._new;
    try {
      if (editing._new) await api.post("/admin/egg-policies", body);
      else await api.put(`/admin/egg-policies/${editing.id}`, body);
      toast.success("Saved.");
      cancel();
      fetchAll();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this egg from tier access? Servers using it stay alive.")) return;
    await api.delete(`/admin/egg-policies/${id}`);
    fetchAll();
  };

  const toggleTier = (t) => {
    const s = new Set(editing.allowed_tiers);
    s.has(t) ? s.delete(t) : s.add(t);
    setEditing({ ...editing, allowed_tiers: Array.from(s) });
  };

  const activeNest = nests.find((n) => String(n.id) === String(editing?.nest_id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-white/40">{policies.length} egg policies</div>
        <button onClick={startCreate} data-testid="egg-policy-new-btn" className="bg-white text-black px-5 py-2.5 text-sm uppercase tracking-wider font-medium hover:bg-white/90 inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add egg</button>
      </div>

      {!pteroOk && (
        <div className="border border-white/15 bg-white/5 p-4 text-sm text-white/70">Connect Pterodactyl in <a href="/admin/settings" className="underline">Settings</a> first to pick nests &amp; eggs.</div>
      )}

      {editing && (
        <div className="border border-white/15 bg-[#0a0a0a] p-6 space-y-5" data-testid="egg-policy-editor">
          <div className="grid md:grid-cols-2 gap-5">
            <Select label="Nest" value={editing.nest_id} onChange={(v) => setEditing({ ...editing, nest_id: v, egg_id: "" })} options={nests.map((n) => ({ value: n.id, label: `${n.name} (id ${n.id})` }))} testid="egg-policy-nest" />
            <Select label="Egg" value={editing.egg_id} onChange={(v) => setEditing({ ...editing, egg_id: v })} options={(activeNest?.eggs || []).map((e) => ({ value: e.id, label: `${e.name} (id ${e.id})` }))} testid="egg-policy-egg" />
            <Field label="Display name (shown to users)" value={editing.display_name} onChange={(v) => setEditing({ ...editing, display_name: v })} testid="egg-policy-display" />
            <Select label="Icon" value={editing.icon} onChange={(v) => setEditing({ ...editing, icon: v })} options={ICONS.map((i) => ({ value: i, label: i }))} testid="egg-policy-icon" />
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-widest text-white/40">Description</label>
              <textarea rows={2} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="mt-2 w-full bg-transparent border border-white/15 focus:border-white py-2 px-3 outline-none text-sm" />
            </div>
            <Field label="Default RAM (MB)" type="number" value={editing.default_ram_mb} onChange={(v) => setEditing({ ...editing, default_ram_mb: v })} testid="egg-policy-ram" />
            <Field label="Default CPU %" type="number" value={editing.default_cpu_pct} onChange={(v) => setEditing({ ...editing, default_cpu_pct: v })} testid="egg-policy-cpu" />
            <Field label="Default Disk (MB)" type="number" value={editing.default_disk_mb} onChange={(v) => setEditing({ ...editing, default_disk_mb: v })} testid="egg-policy-disk" />
            <Field label="Sort order" type="number" value={editing.sort_order} onChange={(v) => setEditing({ ...editing, sort_order: v })} />
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Available to tiers</div>
            <div className="flex gap-2">
              {["free", "premium"].map((t) => {
                const on = editing.allowed_tiers.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggleTier(t)} data-testid={`egg-policy-tier-${t}`} className={`px-4 py-2 text-xs uppercase tracking-wider border ${on ? "bg-white text-black border-white" : "border-white/15 text-white/60 hover:text-white"} inline-flex items-center gap-2`}>
                    {t === "premium" && <Sparkles className="w-3 h-3" />} {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={cancel} className="border border-white/20 px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/5"><X className="w-3.5 h-3.5 inline" /> Cancel</button>
            <button onClick={save} data-testid="egg-policy-save-btn" className="bg-white text-black px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/90"><Save className="w-3.5 h-3.5 inline" /> Save</button>
          </div>
        </div>
      )}

      <div className="border border-white/10 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10">
              <th className="px-6 py-4">Egg</th>
              <th className="px-6 py-4">IDs</th>
              <th className="px-6 py-4">Tiers</th>
              <th className="px-6 py-4">Defaults</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {policies.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-white/40 text-sm">No egg policies yet. Until you add at least one, every panel egg is available to all users.</td></tr>
            ) : policies.map((p) => (
              <tr key={p.id} className="border-b border-white/5" data-testid={`egg-policy-row-${p.id}`}>
                <td className="px-6 py-4">
                  <div className="inline-flex items-center gap-2"><Box className="w-4 h-4 text-white/50" /> {p.display_name}</div>
                  {p.description && <div className="text-xs text-white/40 mt-0.5 line-clamp-1">{p.description}</div>}
                </td>
                <td className="px-6 py-4 text-xs font-mono text-white/50">nest {p.nest_id} · egg {p.egg_id}</td>
                <td className="px-6 py-4">
                  {p.allowed_tiers.map((t) => (
                    <span key={t} className={`text-[10px] uppercase tracking-widest mr-1 px-1.5 py-0.5 ${t === "premium" ? "bg-white text-black" : "bg-white/10"}`}>{t}</span>
                  ))}
                </td>
                <td className="px-6 py-4 text-xs font-mono text-white/60">{p.default_ram_mb}MB · {p.default_cpu_pct}% · {p.default_disk_mb}MB</td>
                <td className="px-6 py-4 text-xs uppercase tracking-wider">{p.active ? "Active" : "Inactive"}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => startEdit(p)} className="text-white/60 hover:text-white p-1"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => remove(p.id)} className="text-white/40 hover:text-white p-1"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =================== Node policies ===================
function NodePoliciesPanel() {
  const [policies, setPolicies] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [editing, setEditing] = useState(null);
  const empty = { node_id: "", display_name: "", location: "", allowed_tiers: ["free", "premium"], sort_order: 0, active: true };

  const fetchAll = async () => {
    const [p, n] = await Promise.all([api.get("/admin/node-policies"), api.get("/admin/pterodactyl/nodes").catch(() => ({ data: [] }))]);
    setPolicies(p.data);
    setNodes(n.data);
  };
  useEffect(() => { fetchAll(); }, []);

  const startCreate = () => setEditing({ ...empty, _new: true });
  const startEdit = (p) => setEditing({ ...p, _new: false });
  const cancel = () => setEditing(null);
  const save = async () => {
    const body = { ...editing, node_id: parseInt(editing.node_id), sort_order: parseInt(editing.sort_order || 0) };
    delete body._new;
    try {
      if (editing._new) await api.post("/admin/node-policies", body);
      else await api.put(`/admin/node-policies/${editing.id}`, body);
      toast.success("Saved.");
      cancel();
      fetchAll();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };
  const remove = async (id) => {
    if (!window.confirm("Remove node from tier access?")) return;
    await api.delete(`/admin/node-policies/${id}`); fetchAll();
  };
  const toggleTier = (t) => {
    const s = new Set(editing.allowed_tiers);
    s.has(t) ? s.delete(t) : s.add(t);
    setEditing({ ...editing, allowed_tiers: Array.from(s) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-white/40">{policies.length} node policies</div>
        <button onClick={startCreate} data-testid="node-policy-new-btn" className="bg-white text-black px-5 py-2.5 text-sm uppercase tracking-wider font-medium hover:bg-white/90 inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add node</button>
      </div>

      {editing && (
        <div className="border border-white/15 bg-[#0a0a0a] p-6 space-y-5" data-testid="node-policy-editor">
          <div className="grid md:grid-cols-2 gap-5">
            <Select label="Node" value={editing.node_id} onChange={(v) => setEditing({ ...editing, node_id: v })} options={nodes.map((n) => ({ value: n.id, label: `${n.name} · ${n.location} (id ${n.id})` }))} testid="node-policy-node" />
            <Field label="Display name" value={editing.display_name} onChange={(v) => setEditing({ ...editing, display_name: v })} testid="node-policy-display" />
            <Field label="Location override" value={editing.location || ""} onChange={(v) => setEditing({ ...editing, location: v })} />
            <Field label="Sort order" type="number" value={editing.sort_order} onChange={(v) => setEditing({ ...editing, sort_order: v })} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Available to tiers</div>
            <div className="flex gap-2">
              {["free", "premium"].map((t) => {
                const on = editing.allowed_tiers.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggleTier(t)} data-testid={`node-policy-tier-${t}`} className={`px-4 py-2 text-xs uppercase tracking-wider border ${on ? "bg-white text-black border-white" : "border-white/15 text-white/60 hover:text-white"} inline-flex items-center gap-2`}>
                    {t === "premium" && <Sparkles className="w-3 h-3" />} {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={cancel} className="border border-white/20 px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/5">Cancel</button>
            <button onClick={save} data-testid="node-policy-save-btn" className="bg-white text-black px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/90">Save</button>
          </div>
        </div>
      )}

      <div className="border border-white/10 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10">
              <th className="px-6 py-4">Node</th>
              <th className="px-6 py-4">Panel ID</th>
              <th className="px-6 py-4">Tiers</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {policies.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-white/40 text-sm">No node policies yet. All panel nodes are open to all users until you add one.</td></tr>
            ) : policies.map((p) => (
              <tr key={p.id} className="border-b border-white/5" data-testid={`node-policy-row-${p.id}`}>
                <td className="px-6 py-4">
                  <div className="inline-flex items-center gap-2"><ServerIcon className="w-4 h-4 text-white/50" /> {p.display_name}</div>
                  <div className="text-xs text-white/40 mt-0.5">{p.location}</div>
                </td>
                <td className="px-6 py-4 text-xs font-mono text-white/50">{p.node_id}</td>
                <td className="px-6 py-4">
                  {p.allowed_tiers.map((t) => (
                    <span key={t} className={`text-[10px] uppercase tracking-widest mr-1 px-1.5 py-0.5 ${t === "premium" ? "bg-white text-black" : "bg-white/10"}`}>{t}</span>
                  ))}
                </td>
                <td className="px-6 py-4 text-xs uppercase tracking-wider">{p.active ? "Active" : "Inactive"}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => startEdit(p)} className="text-white/60 hover:text-white p-1"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => remove(p.id)} className="text-white/40 hover:text-white p-1"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", testid }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-white/40">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-2 outline-none" />
    </div>
  );
}
function Select({ label, value, onChange, options, testid }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-white/40">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-2 outline-none">
        <option value="" className="bg-black">— Select —</option>
        {options.map((o) => <option key={o.value} value={o.value} className="bg-black">{o.label}</option>)}
      </select>
    </div>
  );
}
