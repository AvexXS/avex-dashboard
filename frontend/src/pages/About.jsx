import React from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function About() {
  return (
    <div className="min-h-screen bg-black text-white grain">
      <Navbar />

      <section className="pt-36 pb-24">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">/ About</div>
            <h1 className="font-display text-5xl md:text-7xl font-light tracking-tighter">
              We run servers<br /><span className="text-white/40">for the right reasons.</span>
            </h1>
            <div className="mt-12 grid md:grid-cols-2 gap-12">
              <p className="text-white/70 leading-relaxed text-lg">
                Avex started because game hosting got bloated. Forums full of upsells, slow panels, and dashboards designed by accountants. We wanted a single place to run a Minecraft server, get a clean landing page, and ship a sharp video — without negotiating five different vendors.
              </p>
              <p className="text-white/70 leading-relaxed text-lg">
                Today we host community servers, freelance studios, and a small but loud roster of creators. Every feature we ship gets the same question: does this make our users faster, or just bigger?
              </p>
            </div>

            <div className="mt-16 grid md:grid-cols-3 gap-px bg-white/10 border border-white/10">
              {[
                { k: "2026", v: "Founded" },
                { k: "3", v: "Global Regions" },
                { k: "<60s", v: "From signup to first server" },
              ].map((s) => (
                <div key={s.v} className="bg-black p-8">
                  <div className="font-display text-4xl font-light tracking-tighter">{s.k}</div>
                  <div className="text-xs uppercase tracking-widest text-white/40 mt-2">{s.v}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
