import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function VPS() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    subject: "VPS Enquiry",
    ram: "8",
    cpu: "4",
    storage: "100",
    bandwidth: "Unlimited",
    location: "London",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.message("Please log in or create an account to submit an enquiry.");
      navigate("/login");
      return;
    }
    setSubmitting(true);
    const body = `RAM: ${form.ram} GB\nCPU: ${form.cpu} cores\nStorage: ${form.storage} GB\nBandwidth: ${form.bandwidth}\nLocation: ${form.location}\n\n${form.message}`;
    try {
      await api.post("/tickets", {
        subject: form.subject,
        category: "vps_enquiry",
        message: body,
        priority: "normal",
      });
      toast.success("Enquiry submitted. We'll reply within 24 hours.");
      navigate("/dashboard/tickets");
    } catch (e) {
      toast.error("Could not submit enquiry. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-black text-white grain">
      <Navbar />

      <section className="pt-36 pb-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">/ VPS &amp; Dedicated</div>
            <h1 className="font-display text-5xl md:text-7xl font-light tracking-tighter max-w-4xl">
              Custom boxes.<br /><span className="text-white/40">Quoted in 24 hours.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-white/60 leading-relaxed">
              Tell us what you need. Our team will spec a VPS or dedicated machine for you and reply directly in your dashboard.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <form onSubmit={submit} className="border border-white/10 p-8 md:p-12 bg-[#0a0a0a]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="RAM (GB)" name="ram" value={form.ram} onChange={upd("ram")} />
              <Field label="CPU cores" name="cpu" value={form.cpu} onChange={upd("cpu")} />
              <Field label="Storage (GB)" name="storage" value={form.storage} onChange={upd("storage")} />
              <Field label="Bandwidth" name="bandwidth" value={form.bandwidth} onChange={upd("bandwidth")} />
              <div className="md:col-span-2">
                <label className="text-xs uppercase tracking-widest text-white/40">Preferred location</label>
                <select
                  value={form.location}
                  onChange={upd("location")}
                  data-testid="vps-location"
                  className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none"
                >
                  <option className="bg-black">London</option>
                  <option className="bg-black">New York</option>
                  <option className="bg-black">Mumbai</option>
                  <option className="bg-black">Frankfurt</option>
                  <option className="bg-black">Singapore</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs uppercase tracking-widest text-white/40">Additional details</label>
                <textarea
                  value={form.message}
                  onChange={upd("message")}
                  rows={5}
                  data-testid="vps-message"
                  className="mt-2 w-full bg-transparent border border-white/20 focus:border-white p-4 outline-none font-mono text-sm"
                  placeholder="Use cases, OS, software, expected traffic..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-testid="vps-submit-btn"
              className="mt-8 bg-white text-black px-8 py-4 text-sm uppercase tracking-wider font-medium hover:bg-white/90 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit enquiry"}
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Field({ label, name, value, onChange }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-white/40">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        data-testid={`vps-input-${name}`}
        className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none"
      />
    </div>
  );
}
