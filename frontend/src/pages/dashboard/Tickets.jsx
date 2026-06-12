import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Circle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const CATEGORIES = [
  { id: "support", label: "Support" },
  { id: "design", label: "Design" },
  { id: "video_editing", label: "Video editing" },
  { id: "vps_enquiry", label: "VPS enquiry" },
  { id: "billing", label: "Billing" },
];

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [open, setOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState({ subject: "", category: "support", message: "", plan_id: null });
  const [loading, setLoading] = useState(false);

  const fetchTickets = () => api.get("/tickets").then(({ data }) => setTickets(data));

  useEffect(() => {
    fetchTickets();
    if (params.get("new") === "1") {
      setOpen(true);
      const planId = params.get("plan");
      const category = params.get("category") || "support";
      setForm((f) => ({ ...f, plan_id: planId, category: category === "video_editing" ? "video_editing" : category === "design" ? "design" : "support" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/tickets", { ...form });
      toast.success("Ticket created.");
      setOpen(false);
      setForm({ subject: "", category: "support", message: "", plan_id: null });
      params.delete("new");
      params.delete("plan");
      params.delete("category");
      setParams(params, { replace: true });
      fetchTickets();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not create ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Tickets</div>
          <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Support &amp; orders</h1>
        </div>
        <button onClick={() => setOpen(true)} data-testid="tickets-new-btn" className="bg-white text-black px-6 py-3 text-sm uppercase tracking-wider font-medium hover:bg-white/90 inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> New ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="border border-white/10 p-12 text-center bg-[#0a0a0a]">
          <div className="font-display text-2xl tracking-tight">No tickets yet</div>
          <p className="text-white/50 mt-2 text-sm">Need a website, a video edit, or just hosting help? Start here.</p>
        </div>
      ) : (
        <div className="border border-white/10 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10">
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last reply</th>
                <th className="px-6 py-4 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]" data-testid={`ticket-row-${t.id}`}>
                  <td className="px-6 py-4">
                    <Link to={`/dashboard/tickets/${t.id}`} className="hover:underline">{t.subject}</Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/60 capitalize">{t.category.replace("_", " ")}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider">
                      <Circle className={`w-2 h-2 ${t.status === "open" ? "fill-white text-white" : t.status === "in_progress" ? "fill-white/50 text-white/50" : "fill-white/20 text-white/20"}`} />
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/40 font-mono">{new Date(t.last_reply_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/dashboard/tickets/${t.id}`} className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white/5" data-testid={`ticket-open-${t.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={create} className="w-full max-w-xl border border-white/15 bg-black p-8">
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ New ticket</div>
            <h2 className="font-display text-3xl mt-2 tracking-tight">Create ticket</h2>
            <div className="mt-8 space-y-6">
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40">Subject</label>
                <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} data-testid="ticket-subject" className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="ticket-category" className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none">
                  {CATEGORIES.map((c) => (<option key={c.id} value={c.id} className="bg-black">{c.label}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40">Message</label>
                <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} data-testid="ticket-message" className="mt-2 w-full bg-transparent border border-white/20 focus:border-white p-3 outline-none font-mono text-sm" />
              </div>
            </div>
            <div className="mt-8 flex gap-3 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-5 py-3 text-sm uppercase tracking-wider border border-white/20 hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={loading} data-testid="ticket-create-submit" className="bg-white text-black px-6 py-3 text-sm uppercase tracking-wider hover:bg-white/90 disabled:opacity-50">{loading ? "Submitting..." : "Create"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
