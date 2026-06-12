import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Send, Lock } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function TicketDetail() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTicket = () => api.get(`/tickets/${ticketId}`).then(({ data }) => {
    setTicket(data.ticket);
    setMessages(data.messages);
  });

  useEffect(() => {
    fetchTicket();
    const i = setInterval(fetchTicket, 8000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const reply = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      await api.post(`/tickets/${ticketId}/reply`, { body });
      setBody("");
      fetchTicket();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Reply failed");
    } finally {
      setLoading(false);
    }
  };

  if (!ticket) return <div className="text-white/40 font-mono text-sm">loading…</div>;

  const isClosed = ticket.status === "closed";

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard/tickets" className="text-xs uppercase tracking-widest text-white/40 hover:text-white inline-flex items-center gap-2" data-testid="ticket-back-link">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to tickets
        </Link>
        <div className="mt-3 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-light tracking-tighter">{ticket.subject}</h1>
            <div className="mt-1 text-sm text-white/40 font-mono">
              {ticket.category.replace("_", " ")} · {ticket.priority} · {ticket.status}
            </div>
          </div>
          {isClosed && (
            <div className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 text-white/60 inline-flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" /> Closed
            </div>
          )}
        </div>
      </div>

      <div className="border border-white/10 bg-[#0a0a0a] divide-y divide-white/10">
        {messages.map((m) => {
          const isStaff = ["admin", "staff", "engineer"].includes(m.author_role);
          return (
            <div key={m.id} className="p-6" data-testid={`ticket-message-${m.id}`}>
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 ${isStaff ? "bg-white text-black" : "bg-white/10 text-white"} flex items-center justify-center font-mono text-sm`}>
                    {m.author_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm">{m.author_name}</div>
                    <div className="text-xs uppercase tracking-widest text-white/40">{isStaff ? "AVEX TEAM" : "YOU"}</div>
                  </div>
                </div>
                <div className="text-xs font-mono text-white/40">{new Date(m.created_at).toLocaleString()}</div>
              </div>
              <div className="whitespace-pre-wrap text-white/80 leading-relaxed text-sm">{m.body}</div>
            </div>
          );
        })}
      </div>

      {!isClosed && (
        <form onSubmit={reply} className="space-y-3">
          <textarea
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a reply…"
            data-testid="ticket-reply-input"
            className="w-full bg-transparent border border-white/15 focus:border-white p-4 outline-none font-mono text-sm"
          />
          <button type="submit" disabled={loading} data-testid="ticket-reply-submit" className="bg-white text-black px-6 py-3 text-sm uppercase tracking-wider font-medium hover:bg-white/90 inline-flex items-center gap-2 disabled:opacity-50">
            <Send className="w-3.5 h-3.5" /> Send reply
          </button>
        </form>
      )}
    </div>
  );
}
