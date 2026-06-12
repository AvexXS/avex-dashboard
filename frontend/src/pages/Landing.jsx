import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Server, Palette, Film, Shield, Zap, Globe } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/lib/api";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
};

export default function Landing() {
  const [plans, setPlans] = useState([]);
  useEffect(() => {
    api.get("/plans?category=hosting").then(({ data }) => setPlans(data)).catch(() => {});
  }, []);

  const free = plans.find((p) => p.is_free);
  const premium = plans.filter((p) => !p.is_free).slice(0, 3);

  return (
    <div className="min-h-screen bg-black text-white grain">
      <Navbar />

      {/* HERO */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-32 spotlight overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl"
          >
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/40 mb-8">
              <span className="w-8 h-px bg-white/30" /> Avex Cloud · est. 2026
            </div>
            <h1 data-testid="hero-headline" className="font-display text-5xl sm:text-7xl md:text-8xl font-light leading-[0.95] tracking-tighter">
              High performance<br />
              Servers <span className="italic font-light text-white/60">&amp;</span> Designs<br />
              <span className="text-white/40">at a low performance price.</span>
            </h1>
            <p className="mt-10 text-lg text-white/60 max-w-2xl leading-relaxed">
              Avex is a cloud platform for game servers, custom websites, and clean video edits. One panel, real performance, fair pricing.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <Link
                to="/signup"
                data-testid="hero-cta-start-free"
                className="group inline-flex items-center justify-center gap-2 bg-white text-black px-8 py-4 text-sm uppercase tracking-wider font-medium hover:bg-white/90 transition-colors"
              >
                Start for free
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link
                to="/pricing"
                data-testid="hero-cta-premium"
                className="inline-flex items-center justify-center gap-2 border border-white/20 px-8 py-4 text-sm uppercase tracking-wider font-medium hover:bg-white/5 hover:border-white/40 transition-colors"
              >
                Choose premium plans
              </Link>
            </div>
          </motion.div>

          {/* Stats strip */}
          <motion.div {...fadeUp} className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10">
            {[
              { k: "99.9%", v: "Uptime" },
              { k: "<30ms", v: "Avg. ping" },
              { k: "24/7", v: "Support" },
              { k: "0$", v: "To start" },
            ].map((s) => (
              <div key={s.v} className="bg-black p-6 md:p-8">
                <div className="font-display text-3xl md:text-4xl font-light tracking-tighter">{s.k}</div>
                <div className="text-xs uppercase tracking-widest text-white/40 mt-2">{s.v}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-y border-white/10 py-6 overflow-hidden bg-black">
        <div className="flex whitespace-nowrap animate-marquee">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-12 px-6 font-display text-2xl md:text-3xl font-light tracking-tight text-white/50">
              {["MINECRAFT", "WEBSITES", "VIDEO EDITS", "VPS", "BEDROCK", "PYTHON", "NODE.JS", "DESIGN", "DDOS PROTECTED"].map((w) => (
                <React.Fragment key={w}>
                  <span>{w}</span>
                  <span className="text-white/20">/</span>
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES BENTO */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div {...fadeUp} className="grid md:grid-cols-12 gap-6 mb-16 items-end">
            <div className="md:col-span-8">
              <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">/ 01 — Services</div>
              <h2 className="font-display text-4xl md:text-6xl font-light tracking-tighter">
                One platform.<br />Three sharp products.
              </h2>
            </div>
            <p className="md:col-span-4 text-white/60 leading-relaxed">
              Run game servers like a pro. Get a website that doesn't look templated. Ship video that moves.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="grid md:grid-cols-12 gap-6">
            <Link to="/pricing" className="md:col-span-7 border border-white/10 p-8 md:p-12 lift bg-[#0a0a0a] group" data-testid="services-card-hosting">
              <Server className="w-8 h-8 mb-8 text-white" strokeWidth={1.25} />
              <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Game Server Hosting</div>
              <h3 className="font-display text-3xl md:text-4xl font-light tracking-tight leading-tight">
                Minecraft, Bedrock, Python, Node.js — one click away.
              </h3>
              <div className="mt-10 inline-flex items-center gap-2 text-sm uppercase tracking-wider text-white/70 group-hover:text-white">
                Explore hosting <ArrowUpRight className="w-4 h-4" />
              </div>
            </Link>

            <Link to="/design" className="md:col-span-5 border border-white/10 p-8 md:p-12 lift bg-[#0a0a0a] group" data-testid="services-card-design">
              <Palette className="w-8 h-8 mb-8 text-white" strokeWidth={1.25} />
              <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Website Design</div>
              <h3 className="font-display text-2xl md:text-3xl font-light tracking-tight">
                Brutalist, brand-led websites. Built fast.
              </h3>
              <div className="mt-10 inline-flex items-center gap-2 text-sm uppercase tracking-wider text-white/70 group-hover:text-white">
                See plans <ArrowUpRight className="w-4 h-4" />
              </div>
            </Link>

            <Link to="/design" className="md:col-span-5 border border-white/10 p-8 md:p-12 lift bg-[#0a0a0a] group" data-testid="services-card-video">
              <Film className="w-8 h-8 mb-8 text-white" strokeWidth={1.25} />
              <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Video Editing</div>
              <h3 className="font-display text-2xl md:text-3xl font-light tracking-tight">
                Cinematic edits for short-form &amp; long-form.
              </h3>
              <div className="mt-10 inline-flex items-center gap-2 text-sm uppercase tracking-wider text-white/70 group-hover:text-white">
                See plans <ArrowUpRight className="w-4 h-4" />
              </div>
            </Link>

            <Link to="/vps" className="md:col-span-7 border border-white/10 p-8 md:p-12 lift bg-[#0a0a0a] group" data-testid="services-card-vps">
              <Globe className="w-8 h-8 mb-8 text-white" strokeWidth={1.25} />
              <div className="text-xs uppercase tracking-widest text-white/40 mb-3">VPS / Virtual Dedicated</div>
              <h3 className="font-display text-3xl md:text-4xl font-light tracking-tight">
                Custom-spec VPS &amp; dedicated boxes — enquire and get a quote in 24h.
              </h3>
              <div className="mt-10 inline-flex items-center gap-2 text-sm uppercase tracking-wider text-white/70 group-hover:text-white">
                Request a quote <ArrowUpRight className="w-4 h-4" />
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="border-t border-white/10 py-24 md:py-32 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div {...fadeUp} className="grid md:grid-cols-12 gap-6 mb-16 items-end">
            <div className="md:col-span-8">
              <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">/ 02 — Pricing</div>
              <h2 className="font-display text-4xl md:text-6xl font-light tracking-tighter">
                Free to start.<br />Premium when you scale.
              </h2>
            </div>
            <p className="md:col-span-4 text-white/60 leading-relaxed">
              Every account starts free with 2 GB RAM, 1 core and 5 GB storage. Upgrade in the dashboard, anytime.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-px bg-white/10">
            {free && (
              <div className="bg-black p-8 flex flex-col" data-testid="pricing-card-free">
                <div className="text-xs uppercase tracking-widest text-white/40">{free.name}</div>
                <div className="mt-4 font-display text-5xl font-light tracking-tighter">$0</div>
                <div className="text-white/40 text-sm mt-1">forever</div>
                <ul className="mt-8 space-y-2 text-sm text-white/70 flex-1">
                  {free.features.map((f) => (<li key={f} className="flex items-start gap-2"><span className="text-white/30 mt-1">+</span> {f}</li>))}
                </ul>
                <Link to="/signup" className="mt-8 inline-block w-full text-center border border-white/20 px-5 py-3 text-sm uppercase tracking-wider hover:bg-white/5">
                  Start free
                </Link>
              </div>
            )}
            {premium.map((p, idx) => (
              <div key={p.id} className={`bg-black p-8 flex flex-col ${idx === 1 ? "md:bg-white md:text-black" : ""}`} data-testid={`pricing-card-${p.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className={`text-xs uppercase tracking-widest ${idx === 1 ? "text-black/50" : "text-white/40"}`}>{p.name}</div>
                <div className="mt-4 font-display text-5xl font-light tracking-tighter">${p.price}</div>
                <div className={`text-sm mt-1 ${idx === 1 ? "text-black/50" : "text-white/40"}`}>/{p.cycle === "monthly" ? "mo" : "once"}</div>
                <ul className={`mt-8 space-y-2 text-sm flex-1 ${idx === 1 ? "text-black/80" : "text-white/70"}`}>
                  {p.features.map((f) => (<li key={f} className="flex items-start gap-2"><span className={idx === 1 ? "text-black/40" : "text-white/30"}>+</span> {f}</li>))}
                </ul>
                <Link
                  to="/signup"
                  className={`mt-8 inline-block w-full text-center px-5 py-3 text-sm uppercase tracking-wider ${idx === 1 ? "bg-black text-white hover:bg-black/90" : "border border-white/20 hover:bg-white/5"}`}
                >
                  Choose plan
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link to="/pricing" className="inline-flex items-center gap-2 border-b border-white/30 hover:border-white pb-1 text-sm uppercase tracking-wider">
              See full plan comparison <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div {...fadeUp}>
            <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">/ 03 — Why Avex</div>
            <h2 className="font-display text-4xl md:text-6xl font-light tracking-tighter max-w-4xl">
              Built for the people who actually run servers.
            </h2>
          </motion.div>

          <div className="mt-16 grid md:grid-cols-3 gap-px bg-white/10 border-y border-white/10">
            {[
              { icon: Zap, t: "NVMe-fast", d: "Boots in seconds. Whole disk runs on enterprise NVMe — no spinning rust." },
              { icon: Shield, t: "DDoS Protected", d: "Always-on filtering at the edge so your players never feel a packet drop." },
              { icon: Server, t: "Pterodactyl Panel", d: "Full game-server control without ever leaving the Avex dashboard." },
            ].map((f) => (
              <div key={f.t} className="bg-black p-8 md:p-10">
                <f.icon className="w-7 h-7 text-white mb-6" strokeWidth={1.25} />
                <h3 className="font-display text-xl font-medium">{f.t}</h3>
                <p className="mt-3 text-white/60 text-sm leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div {...fadeUp} className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">/ Get started</div>
              <h2 className="font-display text-5xl md:text-7xl font-light tracking-tighter">
                Spin up a server<br />in 60 seconds.
              </h2>
            </div>
            <div className="flex gap-3">
              <Link to="/signup" className="bg-white text-black px-8 py-4 text-sm uppercase tracking-wider font-medium hover:bg-white/90 transition-colors" data-testid="cta-bottom-signup">
                Start for free
              </Link>
              <Link to="/pricing" className="border border-white/20 px-8 py-4 text-sm uppercase tracking-wider hover:bg-white/5">
                Plans
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
