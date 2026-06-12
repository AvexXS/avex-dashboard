import React, { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState("");

  const fetch = () => {
    const q = filter ? `?status=${filter}` : "";
    api.get(`/admin/invoices${q}`).then(({ data }) => setInvoices(data));
  };

  useEffect(() => { fetch(); /* eslint-disable-next-line */ }, [filter]);

  const markPaid = async (id) => {
    try {
      await api.patch(`/admin/invoices/${id}/mark-paid`);
      toast.success("Marked paid.");
      fetch();
    } catch { toast.error("Failed."); }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Admin / Invoices</div>
          <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Invoices</h1>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="admin-invoice-filter" className="bg-transparent border border-white/15 px-3 py-2 text-xs uppercase tracking-wider">
          <option value="" className="bg-black">All</option>
          <option value="unpaid" className="bg-black">Unpaid</option>
          <option value="paid" className="bg-black">Paid</option>
          <option value="void" className="bg-black">Void</option>
        </select>
      </div>

      <div className="border border-white/10 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10">
              <th className="px-6 py-4">Number</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id} className="border-b border-white/5" data-testid={`admin-invoice-row-${i.id}`}>
                <td className="px-6 py-4 font-mono text-sm">{i.invoice_number}</td>
                <td className="px-6 py-4 text-sm">{i.user_email}</td>
                <td className="px-6 py-4 text-sm text-white/70">{i.description}</td>
                <td className="px-6 py-4 font-mono">{i.currency} {i.amount.toFixed(2)}</td>
                <td className="px-6 py-4 text-xs uppercase tracking-wider">{i.status}</td>
                <td className="px-6 py-4 text-xs font-mono text-white/40">{new Date(i.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  {i.status === "unpaid" && (
                    <button onClick={() => markPaid(i.id)} data-testid={`admin-invoice-mark-paid-${i.id}`} className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white/5 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Mark paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
