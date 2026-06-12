import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const CATEGORIES = ["hosting", "website_hosting", "design", "video_editing", "vps"];
const CATEGORY_LABEL = {
  hosting: "Game Server Hosting",
  website_hosting: "Website Hosting (Soon)",
  design: "Website Design",
  video_editing: "Video Editing",
  vps: "VPS / Dedicated",
};
const CYCLES = ["monthly", "one_time"];

const emptyPlan = {
  name: "", category: "hosting", price: 0, currency: "USD", cycle: "monthly",
  ram_gb: 0, cpu_cores: 0, storage_gb: 0, features: [], is_free: false, active: true, sort_order: 99,
};

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyPlan);
  const [filter, setFilter] = useState("");

  const fetchAll = () => api.get("/plans/admin/all").then(({ data }) => setPlans(data));
  useEffect(() => { fetchAll(); }, []);

  const startEdit = (p) => {
    setEditingId(p.id);
    setDraft({ ...p });
  };
  const cancel = () => { setEditingId(null); setDraft(emptyPlan); };
  const startCreate = (category) => {
    setEditingId("new");
    setDraft({ ...emptyPlan, category: category || filter || "hosting" });
  };

  const save = async () => {
    try {
      const payload = { ...draft, price: parseFloat(draft.price), ram_gb: parseFloat(draft.ram_gb), cpu_cores: parseFloat(draft.cpu_cores), storage_gb: parseFloat(draft.storage_gb), sort_order: parseInt(draft.sort_order) };
      if (typeof draft.features === "string") payload.features = draft.features.split("\n").map((s) => s.trim()).filter(Boolean);
      if (editingId === "new") {
        await api.post("/plans/admin", payload);
        toast.success("Plan created.");
      } else {
        await api.put(`/plans/admin/${editingId}`, payload);
        toast.success("Plan updated.");
      }
      cancel();
      fetchAll();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this plan?")) return;
    await api.delete(`/plans/admin/${id}`);
    fetchAll();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Admin / Plans</div>
          <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Plans &amp; pricing</h1>
          <p className="mt-2 text-white/50 text-sm max-w-xl">Create plans per category — Game Server Hosting, Website Hosting, Design, Video Editing, or VPS.</p>
        </div>
        <button onClick={() => startCreate()} data-testid="admin-plan-new-btn" className="bg-white text-black px-6 py-3 text-sm uppercase tracking-wider font-medium hover:bg-white/90 inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> New plan
        </button>
      </div>

      {/* Category tabs */}
      <div className="border-b border-white/10 flex flex-wrap gap-2">
        <CategoryTab active={filter === ""} onClick={() => setFilter("")} count={plans.length} label="All" testid="plan-tab-all" />
        {CATEGORIES.map((c) => (
          <CategoryTab
            key={c}
            active={filter === c}
            onClick={() => setFilter(c)}
            count={plans.filter((p) => p.category === c).length}
            label={CATEGORY_LABEL[c]}
            testid={`plan-tab-${c}`}
          />
        ))}
      </div>

      {editingId && (
        <div className="border border-white/15 p-6 bg-[#0a0a0a] space-y-4" data-testid="admin-plan-editor">
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
            <SelectField label="Category" value={draft.category} options={CATEGORIES} onChange={(v) => setDraft({ ...draft, category: v })} />
            <SelectField label="Cycle" value={draft.cycle} options={CYCLES} onChange={(v) => setDraft({ ...draft, cycle: v })} />
            <Field label="Price" value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} type="number" step="0.01" />
            <Field label="Currency" value={draft.currency} onChange={(v) => setDraft({ ...draft, currency: v })} />
            <Field label="Sort order" value={draft.sort_order} onChange={(v) => setDraft({ ...draft, sort_order: v })} type="number" />
            <Field label="RAM (GB)" value={draft.ram_gb} onChange={(v) => setDraft({ ...draft, ram_gb: v })} type="number" />
            <Field label="CPU cores" value={draft.cpu_cores} onChange={(v) => setDraft({ ...draft, cpu_cores: v })} type="number" />
            <Field label="Storage (GB)" value={draft.storage_gb} onChange={(v) => setDraft({ ...draft, storage_gb: v })} type="number" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40">Features (one per line)</label>
            <textarea
              rows={5}
              value={Array.isArray(draft.features) ? draft.features.join("\n") : draft.features}
              onChange={(e) => setDraft({ ...draft, features: e.target.value })}
              data-testid="admin-plan-features"
              className="mt-2 w-full bg-transparent border border-white/20 focus:border-white p-3 outline-none font-mono text-sm"
            />
          </div>
          <div className="flex gap-4 text-sm">
            <Toggle label="Active" value={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} />
            <Toggle label="Free plan" value={draft.is_free} onChange={(v) => setDraft({ ...draft, is_free: v })} />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={cancel} className="border border-white/20 px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/5 inline-flex items-center gap-2"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={save} data-testid="admin-plan-save-btn" className="bg-white text-black px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/90 inline-flex items-center gap-2"><Save className="w-3.5 h-3.5" /> Save</button>
          </div>
        </div>
      )}

      <div className="border border-white/10 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Resources</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(filter ? plans.filter((p) => p.category === filter) : plans).map((p) => (
              <tr key={p.id} className="border-b border-white/5" data-testid={`plan-row-${p.id}`}>
                <td className="px-6 py-4">{p.name}</td>
                <td className="px-6 py-4 text-sm text-white/60">{CATEGORY_LABEL[p.category] || p.category}</td>
                <td className="px-6 py-4 font-mono">{p.currency} {p.price.toFixed(2)} <span className="text-white/40">/{p.cycle === "monthly" ? "mo" : "once"}</span></td>
                <td className="px-6 py-4 text-sm font-mono text-white/60">{p.ram_gb || 0}GB · {p.cpu_cores || 0}c · {p.storage_gb || 0}GB</td>
                <td className="px-6 py-4 text-xs uppercase tracking-wider">{p.active ? "Active" : "Inactive"} {p.is_free ? "· Free" : ""}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => startEdit(p)} data-testid={`plan-edit-${p.id}`} className="text-white/60 hover:text-white p-1"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => remove(p.id)} data-testid={`plan-delete-${p.id}`} className="text-white/40 hover:text-white p-1"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", step }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-white/40">{label}</label>
      <input type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-2 outline-none" />
    </div>
  );
}
function SelectField({ label, value, options, onChange }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-white/40">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-2 outline-none">
        {options.map((o) => (
          <option key={o} value={o} className="bg-black">{CATEGORY_LABEL[o] || o.replace("_", " ")}</option>
        ))}
      </select>
    </div>
  );
}

function CategoryTab({ active, onClick, count, label, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`px-4 py-3 text-xs uppercase tracking-wider border-b-2 -mb-px transition-colors inline-flex items-center gap-2 ${
        active ? "border-white text-white" : "border-transparent text-white/50 hover:text-white"
      }`}
    >
      {label}
      <span className={`text-[10px] font-mono px-1.5 py-0.5 ${active ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>{count}</span>
    </button>
  );
}
function Toggle({ label, value, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="accent-white w-4 h-4" />
      <span className="uppercase tracking-wider text-xs text-white/70">{label}</span>
    </label>
  );
}
