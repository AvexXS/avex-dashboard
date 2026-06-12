import React, { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const STATUSES = ["open", "in_progress", "closed"];
const CATEGORIES = ["", "support", "design", "video_editing", "vps_enquiry", "billing"];

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState({ category: "", status: "" });
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");

  const fetch = () => {
    const q = new URLSearchParams();
    if (filter.category) q.set("category", filter.category);
    if (filter.status) q.set("status", filter.status);
    api.get(`/tickets/admin/all?${q.toString()}`).then(({ data }) => setTickets(data));
  };

  useEffect(() => { fetch(); /* eslint-disable-next-line */ }, [filter]);

  const openTicket = (t) => {
    setActive(t);
    api.get(`/tickets/${t.id}`).then(({ data }) => setMessages(data.messages));
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !active) return;
    try {
      await api.post(`/tickets/${active.id}/reply`, { body: reply });
      setReply("");
      api.get(`/tickets/${active.id}`).then(({ data }) => setMessages(data.messages));
      toast.success("Reply sent.");
    } catch { toast.error("Reply failed"); }
  };

  const setStatus = async (status) => {
    if (!active) return;
    await api.patch(`/tickets/${active.id}/status`, { status });
    toast.success(`Marked ${status}`);
    setActive({ ...active, status });
    fetch();
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Admin / Tickets</div>
        <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Tickets queue</h1>
      </div>

      <div className="flex gap-4 flex-wrap">
        <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })} data-testid="admin-ticket-filter-category" className="bg-transparent border border-white/15 px-3 py-2 text-xs uppercase tracking-wider">
          {CATEGORIES.map((c) => <option key={c || "all"} value={c} className="bg-black">{c ? c.replace("_", " ") : "All categories"}</option>)}
        </select>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} data-testid="admin-ticket-filter-status" className="bg-transparent border border-white/15 px-3 py-2 text-xs uppercase tracking-wider">
          <option value="" className="bg-black">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s} className="bg-black">{s.replace("_", " ")}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-5 border border-white/10 max-h-[70vh] overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="p-8 text-white/40 text-sm">No tickets match filters.</div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => openTicket(t)}
                data-testid={`admin-ticket-${t.id}`}
                className={`w-full text-left px-5 py-4 border-b border-white/10 hover:bg-white/[0.03] ${active?.id === t.id ? "bg-white/[0.06]" : ""}`}
              >
                <div className="flex justify-between gap-3">
                  <div className="truncate">
                    <div className="text-sm">{t.subject}</div>
                    <div className="text-xs text-white/40 mt-0.5">{t.user_name} · {t.category.replace("_", " ")}</div>
                  </div>
                  <div className="text-xs uppercase tracking-wider text-white/60 whitespace-nowrap">{t.status.replace("_", " ")}</div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="md:col-span-7 border border-white/10 bg-[#0a0a0a] min-h-[60vh] flex flex-col">
          {!active ? (
            <div className="p-8 text-white/40 text-sm">Select a ticket to view.</div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <div className="font-display text-lg truncate">{active.subject}</div>
                  <div className="text-xs text-white/40 truncate">{active.user_email}</div>
                </div>
                <select value={active.status} onChange={(e) => setStatus(e.target.value)} data-testid="admin-ticket-status-select" className="bg-transparent border border-white/15 px-3 py-1.5 text-xs uppercase tracking-wider">
                  {STATUSES.map((s) => <option key={s} value={s} className="bg-black">{s.replace("_", " ")}</option>)}
                </select>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-white/10">
                {messages.map((m) => {
                  const isStaff = ["admin", "staff", "engineer"].includes(m.author_role);
                  return (
                    <div key={m.id} className="p-5">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="text-xs uppercase tracking-wider text-white/60">{m.author_name} · {isStaff ? "TEAM" : "USER"}</div>
                        <div className="text-xs font-mono text-white/30">{new Date(m.created_at).toLocaleString()}</div>
                      </div>
                      <div className="whitespace-pre-wrap text-sm text-white/80">{m.body}</div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={sendReply} className="p-4 border-t border-white/10 flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply…"
                  data-testid="admin-ticket-reply-input"
                  className="flex-1 bg-transparent border-b border-white/20 focus:border-white py-2 outline-none text-sm"
                />
                <button type="submit" data-testid="admin-ticket-reply-send" className="bg-white text-black px-4 py-2 text-xs uppercase tracking-wider hover:bg-white/90 inline-flex items-center gap-1">
                  <Send className="w-3 h-3" /> Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
