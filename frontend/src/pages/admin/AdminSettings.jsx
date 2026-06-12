import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState({});

  useEffect(() => {
    api.get("/admin/settings").then(({ data }) => { setSettings(data); setDraft(data); });
  }, []);

  const upd = (k, v) => setDraft({ ...draft, [k]: v });

  const save = async () => {
    const payload = {};
    for (const key of [
      "pterodactyl_url", "pterodactyl_api_key",
      "discord_client_id", "discord_client_secret",
      "google_client_id", "google_client_secret",
      "razorpay_key_id", "razorpay_key_secret",
      "paypal_client_id", "paypal_client_secret",
      "discord_invite_url",
    ]) {
      if (draft[key] !== undefined && draft[key] !== "") payload[key] = draft[key];
    }
    if (draft.enabled_payment_methods) payload.enabled_payment_methods = draft.enabled_payment_methods;

    try {
      await api.put("/admin/settings", payload);
      toast.success("Settings saved.");
      api.get("/admin/settings").then(({ data }) => { setSettings(data); setDraft(data); });
    } catch { toast.error("Save failed."); }
  };

  if (!settings) return <div className="text-white/40 text-sm font-mono">loading…</div>;

  return (
    <div className="space-y-10">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Admin / Settings</div>
        <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Platform settings</h1>
        <p className="mt-2 text-white/50 text-sm max-w-2xl">Configure integrations. Secrets are stored encrypted server-side. Leave a field blank to keep the existing value.</p>
      </div>

      <Section title="Pterodactyl Panel">
        <Field label="Panel URL" value={draft.pterodactyl_url || ""} onChange={(v) => upd("pterodactyl_url", v)} testid="settings-ptero-url" placeholder="https://panel.avex.click" />
        <Field label={`Application API Key ${settings.pterodactyl_api_key_set ? "(set)" : ""}`} value={draft.pterodactyl_api_key || ""} onChange={(v) => upd("pterodactyl_api_key", v)} testid="settings-ptero-key" placeholder="ptla_..." type="password" />
      </Section>

      <Section title="Discord OAuth">
        <Field label="Client ID" value={draft.discord_client_id || ""} onChange={(v) => upd("discord_client_id", v)} testid="settings-discord-id" />
        <Field label={`Client Secret ${settings.discord_client_secret_set ? "(set)" : ""}`} value={draft.discord_client_secret || ""} onChange={(v) => upd("discord_client_secret", v)} testid="settings-discord-secret" type="password" />
        <Field label="Discord Invite URL" value={draft.discord_invite_url || ""} onChange={(v) => upd("discord_invite_url", v)} testid="settings-discord-invite" />
      </Section>

      <Section title="Google OAuth">
        <Field label="Client ID" value={draft.google_client_id || ""} onChange={(v) => upd("google_client_id", v)} testid="settings-google-id" />
        <Field label={`Client Secret ${settings.google_client_secret_set ? "(set)" : ""}`} value={draft.google_client_secret || ""} onChange={(v) => upd("google_client_secret", v)} testid="settings-google-secret" type="password" />
      </Section>

      <Section title="Razorpay (India)">
        <Field label="Key ID" value={draft.razorpay_key_id || ""} onChange={(v) => upd("razorpay_key_id", v)} testid="settings-razorpay-id" />
        <Field label={`Key Secret ${settings.razorpay_key_secret_set ? "(set)" : ""}`} value={draft.razorpay_key_secret || ""} onChange={(v) => upd("razorpay_key_secret", v)} testid="settings-razorpay-secret" type="password" />
      </Section>

      <Section title="PayPal">
        <Field label="Client ID" value={draft.paypal_client_id || ""} onChange={(v) => upd("paypal_client_id", v)} testid="settings-paypal-id" />
        <Field label={`Client Secret ${settings.paypal_client_secret_set ? "(set)" : ""}`} value={draft.paypal_client_secret || ""} onChange={(v) => upd("paypal_client_secret", v)} testid="settings-paypal-secret" type="password" />
      </Section>

      <div className="flex justify-end">
        <button onClick={save} data-testid="settings-save-btn" className="bg-white text-black px-6 py-3 text-sm uppercase tracking-wider font-medium hover:bg-white/90 inline-flex items-center gap-2">
          <Save className="w-4 h-4" /> Save settings
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="border border-white/10 p-6 bg-[#0a0a0a]">
      <div className="text-xs uppercase tracking-widest text-white/40 mb-4">{title}</div>
      <div className="grid md:grid-cols-2 gap-6">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, testid }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-white/40">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid={testid} className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-2 outline-none" />
    </div>
  );
}
