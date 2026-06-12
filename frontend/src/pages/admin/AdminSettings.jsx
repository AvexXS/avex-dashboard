import React, { useEffect, useState } from "react";
import { Save, Copy, CheckCircle2, ExternalLink, ChevronDown, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const REDIRECTS = {
  discord: `${BACKEND_URL}/api/auth/oauth/discord/callback`,
  google: `${BACKEND_URL}/api/auth/oauth/google/callback`,
};

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState({});
  const [open, setOpen] = useState({ ptero: true, discord: false, google: false, razorpay: false, paypal: false });
  const [copied, setCopied] = useState("");

  useEffect(() => {
    api.get("/admin/settings").then(({ data }) => { setSettings(data); setDraft(data); });
  }, []);

  const upd = (k, v) => setDraft({ ...draft, [k]: v });

  const save = async () => {
    const payload = {};
    for (const key of [
      "pterodactyl_url", "pterodactyl_api_key", "pterodactyl_client_key",
      "discord_client_id", "discord_client_secret",
      "google_client_id", "google_client_secret",
      "razorpay_key_id", "razorpay_key_secret",
      "paypal_client_id", "paypal_client_secret",
      "discord_invite_url",
    ]) {
      if (draft[key] !== undefined && draft[key] !== "") payload[key] = draft[key];
    }
    try {
      await api.put("/admin/settings", payload);
      toast.success("Settings saved.");
      const { data } = await api.get("/admin/settings");
      setSettings(data); setDraft(data);
    } catch { toast.error("Save failed."); }
  };

  const copy = (key, value) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    toast.success("Copied.");
    setTimeout(() => setCopied(""), 1500);
  };

  if (!settings) return <div className="text-white/40 text-sm font-mono">loading…</div>;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Admin / Settings</div>
        <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Platform settings</h1>
        <p className="mt-2 text-white/50 text-sm max-w-2xl">Configure integrations. Secrets are stored server-side. Leave a field blank to keep the existing value.</p>
      </div>

      {/* PTERODACTYL */}
      <Section
        title="Pterodactyl Panel"
        subtitle="Once connected, every server, file, database and backup goes through your panel."
        isOpen={open.ptero}
        onToggle={() => setOpen({ ...open, ptero: !open.ptero })}
      >
        <Field label="Panel URL" value={draft.pterodactyl_url || ""} onChange={(v) => upd("pterodactyl_url", v)} testid="settings-ptero-url" placeholder="https://panel.avex.click" />
        <Field label={`Application API Key ${settings.pterodactyl_api_key_set ? "(set)" : ""}`} value={draft.pterodactyl_api_key || ""} onChange={(v) => upd("pterodactyl_api_key", v)} testid="settings-ptero-key" placeholder="ptla_..." type="password" />
        <Field label={`Admin Client API Key ${settings.pterodactyl_client_key ? "(set)" : ""}`} value={draft.pterodactyl_client_key || ""} onChange={(v) => upd("pterodactyl_client_key", v)} testid="settings-ptero-client-key" placeholder="ptlc_..." type="password" />

        <Guide title="How to get these keys">
          <ol className="list-decimal list-inside space-y-2">
            <li><b>Application API Key</b>: in Pterodactyl, go to <span className="font-mono text-white/80">Admin → Application API → Create New</span>. Grant <span className="font-mono">Read &amp; Write</span> on Users, Servers, Nodes, Locations, Nests, Eggs. Paste the <span className="font-mono">ptla_</span> key above.</li>
            <li><b>Admin Client API Key</b>: log into Pterodactyl as an admin user → click your avatar → <span className="font-mono">API Credentials → Create API Key</span>. Description "Avex". Paste the <span className="font-mono">ptlc_</span> key above. This key gives Avex access to all servers' files/console/databases/backups.</li>
            <li><b>Panel URL</b>: the public URL of your Pterodactyl install (no trailing slash).</li>
          </ol>
          <p className="mt-3 text-white/50 text-xs">Nests, eggs, nodes, and allocations are configured directly in Pterodactyl. Avex shows them in <span className="font-mono">Admin → Infrastructure</span> live.</p>
        </Guide>
      </Section>

      {/* DISCORD OAUTH */}
      <Section
        title="Discord OAuth"
        subtitle="Let users sign in with Discord."
        isOpen={open.discord}
        onToggle={() => setOpen({ ...open, discord: !open.discord })}
      >
        <Field label="Client ID" value={draft.discord_client_id || ""} onChange={(v) => upd("discord_client_id", v)} testid="settings-discord-id" />
        <Field label={`Client Secret ${settings.discord_client_secret_set ? "(set)" : ""}`} value={draft.discord_client_secret || ""} onChange={(v) => upd("discord_client_secret", v)} testid="settings-discord-secret" type="password" />
        <Field label="Discord Invite URL (used in nav &amp; footer)" value={draft.discord_invite_url || ""} onChange={(v) => upd("discord_invite_url", v)} testid="settings-discord-invite" />

        <RedirectBox label="Redirect URI" value={REDIRECTS.discord} keyName="discord-redirect" copied={copied} onCopy={copy} />

        <Guide title="Set up Discord OAuth">
          <ol className="list-decimal list-inside space-y-2">
            <li>Open the <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">Discord Developer Portal <ExternalLink className="w-3 h-3" /></a> and click <span className="font-mono">New Application</span>.</li>
            <li>Name it "Avex" and create it.</li>
            <li>Under <span className="font-mono">OAuth2 → General</span>, copy the <b>Client ID</b> and <b>Client Secret</b> into the fields above.</li>
            <li>Still in <span className="font-mono">OAuth2 → General</span>, click <span className="font-mono">Add Redirect</span> and paste:<br/><span className="font-mono text-white/80 text-xs break-all">{REDIRECTS.discord}</span></li>
            <li>Save. Avex will now show a "Continue with Discord" button on the login page.</li>
          </ol>
        </Guide>
      </Section>

      {/* GOOGLE OAUTH */}
      <Section
        title="Google OAuth"
        subtitle="Let users sign in with Google."
        isOpen={open.google}
        onToggle={() => setOpen({ ...open, google: !open.google })}
      >
        <Field label="Client ID" value={draft.google_client_id || ""} onChange={(v) => upd("google_client_id", v)} testid="settings-google-id" />
        <Field label={`Client Secret ${settings.google_client_secret_set ? "(set)" : ""}`} value={draft.google_client_secret || ""} onChange={(v) => upd("google_client_secret", v)} testid="settings-google-secret" type="password" />

        <RedirectBox label="Authorized redirect URI" value={REDIRECTS.google} keyName="google-redirect" copied={copied} onCopy={copy} />

        <Guide title="Set up Google OAuth">
          <ol className="list-decimal list-inside space-y-2">
            <li>Open the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">Google Cloud Credentials <ExternalLink className="w-3 h-3" /></a> page.</li>
            <li>Create a project (or pick one), then <span className="font-mono">Create Credentials → OAuth client ID</span>.</li>
            <li>Application type: <b>Web application</b>. Name: "Avex".</li>
            <li>Under <b>Authorized redirect URIs</b>, click <span className="font-mono">+ ADD URI</span> and paste:<br/><span className="font-mono text-white/80 text-xs break-all">{REDIRECTS.google}</span></li>
            <li>Click Create. Copy the <b>Client ID</b> and <b>Client Secret</b> into the fields above and save.</li>
            <li>On the OAuth consent screen, add scopes <span className="font-mono">openid email profile</span> and publish (or keep in testing).</li>
          </ol>
        </Guide>
      </Section>

      {/* RAZORPAY */}
      <Section
        title="Razorpay (India)"
        subtitle="Accept payments in INR. Optional alongside Stripe."
        isOpen={open.razorpay}
        onToggle={() => setOpen({ ...open, razorpay: !open.razorpay })}
      >
        <Field label="Key ID" value={draft.razorpay_key_id || ""} onChange={(v) => upd("razorpay_key_id", v)} testid="settings-razorpay-id" />
        <Field label={`Key Secret ${settings.razorpay_key_secret_set ? "(set)" : ""}`} value={draft.razorpay_key_secret || ""} onChange={(v) => upd("razorpay_key_secret", v)} testid="settings-razorpay-secret" type="password" />
        <Guide title="Get Razorpay keys">
          <ol className="list-decimal list-inside space-y-2">
            <li>Sign into <a href="https://dashboard.razorpay.com/" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">Razorpay Dashboard <ExternalLink className="w-3 h-3" /></a>.</li>
            <li>Go to <span className="font-mono">Settings → API Keys</span>.</li>
            <li>Click <span className="font-mono">Generate Test/Live Key</span> and copy the <b>Key ID</b> + <b>Key Secret</b>.</li>
          </ol>
        </Guide>
      </Section>

      {/* PAYPAL */}
      <Section
        title="PayPal"
        subtitle="Accept PayPal payments. Optional alongside Stripe."
        isOpen={open.paypal}
        onToggle={() => setOpen({ ...open, paypal: !open.paypal })}
      >
        <Field label="Client ID" value={draft.paypal_client_id || ""} onChange={(v) => upd("paypal_client_id", v)} testid="settings-paypal-id" />
        <Field label={`Client Secret ${settings.paypal_client_secret_set ? "(set)" : ""}`} value={draft.paypal_client_secret || ""} onChange={(v) => upd("paypal_client_secret", v)} testid="settings-paypal-secret" type="password" />
        <Guide title="Get PayPal credentials">
          <ol className="list-decimal list-inside space-y-2">
            <li>Open <a href="https://developer.paypal.com/dashboard/applications/sandbox" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">PayPal Developer Apps <ExternalLink className="w-3 h-3" /></a>.</li>
            <li>Create an app (sandbox first). Copy the <b>Client ID</b> + <b>Secret</b>.</li>
          </ol>
        </Guide>
      </Section>

      <div className="flex justify-end sticky bottom-4">
        <button onClick={save} data-testid="settings-save-btn" className="bg-white text-black px-6 py-3 text-sm uppercase tracking-wider font-medium hover:bg-white/90 inline-flex items-center gap-2 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          <Save className="w-4 h-4" /> Save settings
        </button>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children, isOpen, onToggle }) {
  return (
    <div className="border border-white/10 bg-[#0a0a0a]">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-4 p-5 border-b border-white/5 text-left hover:bg-white/[0.02]">
        <div>
          <div className="font-display text-xl">{title}</div>
          <div className="text-xs text-white/50 mt-0.5">{subtitle}</div>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 text-white/40" /> : <ChevronRight className="w-5 h-5 text-white/40" />}
      </button>
      {isOpen && (
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">{React.Children.toArray(children).filter((c) => c?.type === Field)}</div>
          {React.Children.toArray(children).filter((c) => c?.type !== Field)}
        </div>
      )}
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

function RedirectBox({ label, value, keyName, copied, onCopy }) {
  return (
    <div className="border border-white/10 p-3 bg-black/40 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
        <div className="font-mono text-xs text-white/80 truncate mt-1" data-testid={`redirect-${keyName}`}>{value}</div>
      </div>
      <button onClick={() => onCopy(keyName, value)} className="text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white/5 inline-flex items-center gap-1 whitespace-nowrap" data-testid={`copy-${keyName}`}>
        {copied === keyName ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied === keyName ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Guide({ title, children }) {
  return (
    <div className="border-l-2 border-white/20 pl-5 py-1 text-sm text-white/70 leading-relaxed">
      <div className="text-xs uppercase tracking-widest text-white/50 mb-2 inline-flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> {title}</div>
      {children}
    </div>
  );
}
