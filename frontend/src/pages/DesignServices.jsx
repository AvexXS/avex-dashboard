import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Palette, Film, ArrowUpRight, CreditCard, X } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function DesignServices() {
  const [design, setDesign] = useState([]);
  const [video, setVideo] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [brief, setBrief] = useState("");
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      api.get("/plans?category=design"),
      api.get("/plans?category=video_editing"),
    ]).then(([d, v]) => {
      setDesign(d.data);
      setVideo(v.data);
    }).catch(() => {});
  }, []);

  const openOrder = (plan) => {
    if (!user) {
      toast.message("Please log in to order.");
      navigate("/login");
      return;
    }
    setActivePlan(plan);
    setSubject(`${plan.name} order`);
    setBrief("");
  };

  const closeOrder = () => { setActivePlan(null); setBrief(""); setSubject(""); };

  const payAndOrder = async (e) => {
    e.preventDefault();
    if (!activePlan) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/billing/checkout", {
        plan_id: activePlan.id,
        origin_url: window.location.origin,
        intent: "design_order",
        details: brief,
        subject,
      });
      window.location.href = data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start checkout.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white grain">
      <Navbar />

      <section className="pt-36 pb-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">/ Design Studio</div>
            <h1 className="font-display text-5xl md:text-7xl font-light tracking-tighter max-w-4xl">
              Websites &amp; videos<br /><span className="text-white/40">made by humans.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-white/60 leading-relaxed">
              Pick a plan and pay. The moment payment clears, a ticket is opened and a designer or editor is assigned within hours. Track everything from your dashboard.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5" strokeWidth={1.25} />
            <h2 className="font-display text-2xl uppercase tracking-widest">Website Design</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-white/10 border border-white/10">
            {design.map((p) => (
              <div key={p.id} className="bg-black p-8 flex flex-col" data-testid={`design-card-${p.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="text-xs uppercase tracking-widest text-white/40">{p.name}</div>
                <div className="mt-4 font-display text-5xl font-light tracking-tighter">${p.price}</div>
                <div className="text-sm text-white/40 mt-1">{p.cycle === "one_time" ? "one-time" : "/month"}</div>
                <ul className="mt-8 space-y-2 text-sm text-white/70 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2"><span className="text-white/30 mt-1">+</span> {f}</li>
                  ))}
                </ul>
                <button
                  onClick={() => openOrder(p)}
                  data-testid={`design-order-${p.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="mt-8 inline-flex items-center justify-center gap-2 bg-white text-black px-5 py-3 text-sm uppercase tracking-wider hover:bg-white/90"
                >
                  <CreditCard className="w-4 h-4" /> Pay &amp; order
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3 mb-6">
            <Film className="w-5 h-5" strokeWidth={1.25} />
            <h2 className="font-display text-2xl uppercase tracking-widest">Video Editing</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-white/10 border border-white/10">
            {video.map((p) => (
              <div key={p.id} className="bg-black p-8 flex flex-col" data-testid={`video-card-${p.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="text-xs uppercase tracking-widest text-white/40">{p.name}</div>
                <div className="mt-4 font-display text-5xl font-light tracking-tighter">${p.price}</div>
                <div className="text-sm text-white/40 mt-1">{p.cycle === "one_time" ? "one-time" : "/month"}</div>
                <ul className="mt-8 space-y-2 text-sm text-white/70 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2"><span className="text-white/30 mt-1">+</span> {f}</li>
                  ))}
                </ul>
                <button
                  onClick={() => openOrder(p)}
                  data-testid={`video-order-${p.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="mt-8 inline-flex items-center justify-center gap-2 bg-white text-black px-5 py-3 text-sm uppercase tracking-wider hover:bg-white/90"
                >
                  <CreditCard className="w-4 h-4" /> Pay &amp; order
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {activePlan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={closeOrder}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={payAndOrder} className="w-full max-w-xl border border-white/15 bg-black p-8 relative">
            <button type="button" onClick={closeOrder} className="absolute top-4 right-4 text-white/40 hover:text-white" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ {activePlan.category.replace('_', ' ')} order</div>
            <h2 className="font-display text-3xl mt-2 tracking-tight">{activePlan.name} — ${activePlan.price}</h2>
            <p className="text-sm text-white/50 mt-2">After payment, a ticket opens automatically and our team takes it from there.</p>

            <div className="mt-8 space-y-6">
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40">Subject</label>
                <input
                  required value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="design-order-subject"
                  className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40">Brief / requirements</label>
                <textarea
                  required rows={6} value={brief} onChange={(e) => setBrief(e.target.value)}
                  placeholder="What do you want us to build? Brand, references, deadline…"
                  data-testid="design-order-brief"
                  className="mt-2 w-full bg-transparent border border-white/20 focus:border-white p-3 outline-none font-mono text-sm"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse md:flex-row gap-3 justify-end">
              <button type="button" onClick={closeOrder} className="px-5 py-3 text-sm uppercase tracking-wider border border-white/20 hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={submitting} data-testid="design-order-pay-btn" className="bg-white text-black px-6 py-3 text-sm uppercase tracking-wider font-medium hover:bg-white/90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" />
                {submitting ? "Redirecting…" : `Pay $${activePlan.price} & open ticket`}
              </button>
            </div>
            <div className="mt-4 text-xs text-white/40">Secured by Stripe. You'll be redirected back here after payment.</div>
          </form>
        </div>
      )}

      <Footer />
    </div>
  );
}
