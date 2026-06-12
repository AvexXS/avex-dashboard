import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CreditCard, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [params, setParams] = useSearchParams();
  const [polling, setPolling] = useState(false);
  const navigate = useNavigate();

  const fetchInvoices = () => api.get("/billing/invoices").then(({ data }) => setInvoices(data));

  useEffect(() => {
    fetchInvoices();
    api.get("/plans?category=hosting").then(({ data }) => setPlans(data.filter((p) => !p.is_free)));
    const sessionId = params.get("session_id");
    if (sessionId) {
      setPolling(true);
      let attempts = 0;
      const i = setInterval(async () => {
        attempts += 1;
        try {
          const { data } = await api.get(`/billing/checkout/status/${sessionId}`);
          if (data.payment_status === "paid") {
            clearInterval(i);
            setPolling(false);
            params.delete("session_id");
            setParams(params, { replace: true });
            fetchInvoices();
            if (data.intent === "design_order" && data.ticket_id) {
              toast.success("Payment successful — your order ticket is open.");
              navigate(`/dashboard/tickets/${data.ticket_id}`);
            } else {
              toast.success("Payment successful — invoice marked paid.");
            }
          } else if (data.status === "expired" || attempts >= 6) {
            clearInterval(i);
            setPolling(false);
          }
        } catch {
          if (attempts >= 6) { clearInterval(i); setPolling(false); }
        }
      }, 2000);
    }
    if (params.get("canceled")) {
      toast.message("Checkout canceled.");
      params.delete("canceled");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buy = async (planId) => {
    try {
      const { data } = await api.post("/billing/checkout", {
        plan_id: planId,
        origin_url: window.location.origin,
      });
      window.location.href = data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start checkout.");
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Billing</div>
        <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Invoices &amp; payments</h1>
      </div>

      {polling && (
        <div className="border border-white/20 bg-white/5 px-5 py-3 text-sm uppercase tracking-wider inline-flex items-center gap-2" data-testid="billing-polling">
          <Clock className="w-4 h-4" /> Verifying payment…
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs uppercase tracking-widest text-white/40">Upgrade your hosting</div>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-white/10 border border-white/10">
          {plans.map((p) => (
            <div key={p.id} className="bg-black p-6 flex flex-col" data-testid={`billing-plan-${p.name.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="text-xs uppercase tracking-widest text-white/40">{p.name}</div>
              <div className="font-display text-4xl font-light tracking-tighter mt-2">${p.price}<span className="text-sm text-white/40">/{p.cycle === "monthly" ? "mo" : "once"}</span></div>
              <ul className="mt-4 space-y-1 text-sm text-white/70 flex-1">
                {p.features.slice(0, 4).map((f) => <li key={f} className="flex gap-2 text-sm"><span className="text-white/30">+</span>{f}</li>)}
              </ul>
              <button onClick={() => buy(p.id)} data-testid={`billing-buy-${p.name.toLowerCase().replace(/\s+/g, '-')}`} className="mt-6 bg-white text-black px-4 py-2.5 text-sm uppercase tracking-wider hover:bg-white/90 inline-flex items-center justify-center gap-2">
                Upgrade <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs uppercase tracking-widest text-white/40">Invoices</div>
        </div>
        {invoices.length === 0 ? (
          <div className="border border-white/10 p-10 text-center bg-[#0a0a0a]">
            <CreditCard className="w-7 h-7 mx-auto text-white/40" strokeWidth={1.5} />
            <div className="font-display text-xl mt-3">No invoices yet</div>
            <div className="text-sm text-white/50 mt-1">Upgrade a plan or order a service to see invoices here.</div>
          </div>
        ) : (
          <div className="border border-white/10 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10">
                  <th className="px-6 py-4">Invoice</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Pay</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-white/5" data-testid={`invoice-row-${inv.id}`}>
                    <td className="px-6 py-4 font-mono text-sm">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-sm text-white/80">{inv.description}</td>
                    <td className="px-6 py-4 font-mono">{inv.currency} {inv.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      {inv.status === "paid" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider"><CheckCircle2 className="w-3.5 h-3.5" /> Paid</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60"><Clock className="w-3.5 h-3.5" /> Unpaid</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {inv.status === "unpaid" && inv.plan_id && (
                        <button onClick={() => buy(inv.plan_id)} className="text-xs uppercase tracking-wider bg-white text-black px-3 py-1.5 hover:bg-white/90">Pay now</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="border border-white/10 p-6 bg-[#0a0a0a]">
        <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Payment methods</div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="border border-white/15 px-3 py-1.5 uppercase tracking-wider text-white/80">Stripe (Cards)</span>
          <span className="border border-white/10 px-3 py-1.5 uppercase tracking-wider text-white/40">Razorpay — admin to enable</span>
          <span className="border border-white/10 px-3 py-1.5 uppercase tracking-wider text-white/40">PayPal — admin to enable</span>
        </div>
      </div>
    </div>
  );
}
