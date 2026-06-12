import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Save, X, Tag } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const CATEGORIES = [
  { id: "hosting", label: "Game Server Hosting" },
  { id: "website_hosting", label: "Website Hosting" },
  { id: "design", label: "Website Design" },
  { id: "video_editing", label: "Video Editing" },
  { id: "vps", label: "VPS / Dedicated" },
];

const emptyCoupon = {
  code: "",
  discount_percent: 10,
  max_uses: 0,
  active: true,
  expires_at: "",
  applies_to_categories: [],
  note: "",
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyCoupon);

  const fetchAll = () => api.get("/admin/coupons").then(({ data }) => setCoupons(data));
  useEffect(() => { fetchAll(); }, []);

  const startCreate = () => { setEditingId("new"); setDraft(emptyCoupon); };
  const startEdit = (c) => { setEditingId(c.id); setDraft({ ...c, expires_at: c.expires_at || "" }); };
  const cancel = () => { setEditingId(null); setDraft(emptyCoupon); };

  const save = async () => {
    const payload = {
      ...draft,
      code: draft.code.trim().toUpperCase(),
      discount_percent: parseInt(draft.discount_percent),
      max_uses: parseInt(draft.max_uses || 0),
      expires_at: draft.expires_at || null,
    };
    try {
      if (editingId === "new") {
        await api.post("/admin/coupons", payload);
        toast.success("Coupon created.");
      } else {
        await api.put(`/admin/coupons/${editingId}`, payload);
        toast.success("Coupon updated.");
      }
      cancel();
      fetchAll();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this coupon?")) return;
    await api.delete(`/admin/coupons/${id}`);
    fetchAll();
  };

  const toggleCat = (catId) => {
    const set = new Set(draft.applies_to_categories);
    if (set.has(catId)) set.delete(catId); else set.add(catId);
    setDraft({ ...draft, applies_to_categories: Array.from(set) });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Admin / Coupons</div>
          <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Discount codes</h1>
          <p className="mt-2 text-white/50 text-sm max-w-xl">Create % discount codes. Apply at checkout. Restrict by category or limit total uses.</p>
        </div>
        <button onClick={startCreate} data-testid="admin-coupon-new-btn" className="bg-white text-black px-6 py-3 text-sm uppercase tracking-wider font-medium hover:bg-white/90 inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> New coupon
        </button>
      </div>

      {editingId && (
        <div className="border border-white/15 p-6 bg-[#0a0a0a] space-y-6" data-testid="admin-coupon-editor">
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Code" value={draft.code} onChange={(v) => setDraft({ ...draft, code: v.toUpperCase() })} testid="coupon-code" />
            <Field label="Discount %" type="number" value={draft.discount_percent} onChange={(v) => setDraft({ ...draft, discount_percent: v })} testid="coupon-percent" />
            <Field label="Max uses (0 = unlimited)" type="number" value={draft.max_uses} onChange={(v) => setDraft({ ...draft, max_uses: v })} testid="coupon-max-uses" />
            <Field label="Expires at (ISO)" value={draft.expires_at} onChange={(v) => setDraft({ ...draft, expires_at: v })} placeholder="2026-12-31T23:59:59Z" testid="coupon-expires" />
            <Field label="Note (internal)" value={draft.note || ""} onChange={(v) => setDraft({ ...draft, note: v })} testid="coupon-note" />
            <Toggle label="Active" value={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} />
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Applies to (empty = all)</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = draft.applies_to_categories.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCat(c.id)}
                    data-testid={`coupon-cat-${c.id}`}
                    className={`text-xs uppercase tracking-wider px-3 py-1.5 border ${active ? "bg-white text-black border-white" : "border-white/15 text-white/60 hover:text-white"}`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={cancel} className="border border-white/20 px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/5 inline-flex items-center gap-2"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={save} data-testid="admin-coupon-save-btn" className="bg-white text-black px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/90 inline-flex items-center gap-2"><Save className="w-3.5 h-3.5" /> Save</button>
          </div>
        </div>
      )}

      <div className="border border-white/10 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10">
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Discount</th>
              <th className="px-6 py-4">Usage</th>
              <th className="px-6 py-4">Categories</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-white/40 text-sm">No coupons yet. Create your first one.</td></tr>
            ) : coupons.map((c) => (
              <tr key={c.id} className="border-b border-white/5" data-testid={`coupon-row-${c.id}`}>
                <td className="px-6 py-4 font-mono inline-flex items-center gap-2"><Tag className="w-3.5 h-3.5 text-white/40" /> {c.code}</td>
                <td className="px-6 py-4 font-mono">-{c.discount_percent}%</td>
                <td className="px-6 py-4 text-sm font-mono">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : " / ∞"}</td>
                <td className="px-6 py-4 text-xs text-white/60">{c.applies_to_categories?.length ? c.applies_to_categories.map((id) => CATEGORIES.find((x) => x.id === id)?.label).join(", ") : "All"}</td>
                <td className="px-6 py-4 text-xs uppercase tracking-wider">{c.active ? "Active" : "Inactive"}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => startEdit(c)} data-testid={`coupon-edit-${c.id}`} className="text-white/60 hover:text-white p-1"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => remove(c.id)} data-testid={`coupon-delete-${c.id}`} className="text-white/40 hover:text-white p-1"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, testid }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-white/40">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid={testid} className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-2 outline-none" />
    </div>
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
