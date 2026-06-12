import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/lib/api";

export default function Pricing() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    api.get("/plans?category=hosting").then(({ data }) => setPlans(data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-black text-white grain">
      <Navbar />

      <section className="pt-36 pb-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">/ Hosting plans</div>
            <h1 className="font-display text-5xl md:text-7xl font-light tracking-tighter max-w-4xl">
              Pricing<span className="text-white/40">,</span> spelled out.
            </h1>
            <p className="mt-6 max-w-2xl text-white/60 leading-relaxed">
              All plans run on the same hardware. Pick the resources you actually need.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10">
            {plans.map((p, idx) => {
              const featured = idx === 2;
              return (
                <div
                  key={p.id}
                  className={`p-8 flex flex-col ${featured ? "bg-white text-black" : "bg-black text-white"}`}
                  data-testid={`pricing-plan-${p.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="text-xs uppercase tracking-widest opacity-50">{p.name}</div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-display text-5xl font-light tracking-tighter">${p.price}</span>
                    <span className="text-sm opacity-50">/{p.cycle === "monthly" ? "mo" : "once"}</span>
                  </div>
                  <div className="mt-2 text-sm opacity-60">{p.ram_gb} GB RAM · {p.cpu_cores} Core · {p.storage_gb} GB</div>
                  <ul className="mt-8 space-y-2 text-sm flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="opacity-40 mt-1">+</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={`mt-8 inline-block w-full text-center px-5 py-3 text-sm uppercase tracking-wider ${featured ? "bg-black text-white hover:bg-black/90" : "border border-white/20 hover:bg-white/5"}`}
                  >
                    {p.is_free ? "Start free" : "Choose plan"}
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {[
              { q: "Can I cancel anytime?", a: "Yes. Plans are monthly and there are no lock-ins. Cancel from billing." },
              { q: "Do you offer refunds?", a: "Hosting plans are pro-rated. Design & video edits are non-refundable once work begins." },
              { q: "Where are servers located?", a: "London, NYC, Mumbai. Choose at server creation." },
            ].map((f) => (
              <div key={f.q} className="border border-white/10 p-6">
                <div className="text-sm uppercase tracking-wider text-white/60 mb-2">{f.q}</div>
                <p className="text-white/70 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
