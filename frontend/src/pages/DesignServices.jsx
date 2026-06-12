import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Palette, Film, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function DesignServices() {
  const [design, setDesign] = useState([]);
  const [video, setVideo] = useState([]);
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

  const order = (plan) => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate(`/dashboard/tickets?new=1&plan=${plan.id}&category=${plan.category}`);
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
              Pick a plan. A designer or editor is assigned within hours. Track everything from your dashboard.
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
                  onClick={() => order(p)}
                  data-testid={`design-order-${p.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="mt-8 inline-flex items-center justify-center gap-2 border border-white/20 px-5 py-3 text-sm uppercase tracking-wider hover:bg-white/5"
                >
                  Order <ArrowUpRight className="w-4 h-4" />
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
                  onClick={() => order(p)}
                  data-testid={`video-order-${p.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="mt-8 inline-flex items-center justify-center gap-2 border border-white/20 px-5 py-3 text-sm uppercase tracking-wider hover:bg-white/5"
                >
                  Order <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
