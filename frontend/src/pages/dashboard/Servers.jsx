import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus, Trash2, AlertTriangle, ArrowRight, ArrowLeft, X, Cpu, MemoryStick, HardDrive,
  MapPin, Box, Sparkles, Check, Lock, Globe, Search,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const ICON_MAP = {
  minecraft: "🟩",
  python: "🐍",
  nodejs: "⬢",
  rust: "🦀",
  discord: "◆",
  generic: "▪",
};

export default function Servers() {
  const { user } = useAuth();
  const [servers, setServers] = useState([]);
  const [open, setOpen] = useState(false);
  const [pteroStatus, setPteroStatus] = useState(null);

  const fetchServers = () => api.get("/servers").then(({ data }) => setServers(data)).catch(() => {});
  const fetchPteroStatus = () => api.get("/pterodactyl/status").then(({ data }) => setPteroStatus(data)).catch(() => setPteroStatus({ configured: false, reachable: false }));

  useEffect(() => { fetchServers(); fetchPteroStatus(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this server? This cannot be undone.")) return;
    try {
      await api.delete(`/servers/${id}`);
      toast.success("Server deleted.");
      fetchServers();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not delete server.");
    }
  };

  const canCreate = pteroStatus?.configured && pteroStatus?.reachable;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Servers</div>
          <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Your servers</h1>
          {user?.tier === "premium" && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest bg-white text-black px-2 py-0.5">
              <Sparkles className="w-3 h-3" /> Premium tier
            </div>
          )}
        </div>
        <button
          onClick={() => canCreate ? setOpen(true) : toast.error("Pterodactyl panel not configured. Ask an admin.")}
          data-testid="servers-create-btn"
          className="bg-white text-black px-6 py-3 text-sm uppercase tracking-wider font-medium hover:bg-white/90 inline-flex items-center gap-2 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" /> Create server
        </button>
      </div>

      {pteroStatus && !pteroStatus.configured && (
        <div className="border border-white/20 bg-white/5 p-5 flex items-start gap-3" data-testid="ptero-not-configured-banner">
          <AlertTriangle className="w-5 h-5 text-white mt-0.5" />
          <div>
            <div className="text-sm">Pterodactyl panel not connected yet.</div>
            <div className="text-xs text-white/60 mt-1">An admin needs to set the panel URL + API keys in <Link to="/admin/settings" className="underline">Admin → Settings</Link>. Until then, server creation is disabled.</div>
          </div>
        </div>
      )}

      {pteroStatus?.configured && !pteroStatus?.reachable && (
        <div className="border border-white/20 bg-white/5 p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-white mt-0.5" />
          <div>
            <div className="text-sm">Pterodactyl is configured but unreachable.</div>
            <div className="text-xs text-white/60 mt-1 break-all">{pteroStatus.error || "Check the URL & API key in Admin → Settings."}</div>
          </div>
        </div>
      )}

      {servers.length === 0 ? (
        <div className="border border-white/10 p-16 text-center bg-[#0a0a0a]">
          <div className="font-display text-3xl tracking-tight">No servers yet</div>
          <p className="text-white/50 mt-2 text-sm">Spin up your first one in 60 seconds.</p>
          <button onClick={() => canCreate && setOpen(true)} disabled={!canCreate} className="mt-6 bg-white text-black px-6 py-3 text-sm uppercase tracking-wider font-medium hover:bg-white/90 disabled:opacity-40 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create your first server
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {servers.map((s) => (
            <div key={s.id} className="border border-white/10 bg-[#0a0a0a] p-6 hover:border-white/25 transition-colors" data-testid={`server-card-${s.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/dashboard/servers/${s.id}`} className="font-display text-2xl hover:underline truncate block">{s.name}</Link>
                  <div className="text-xs text-white/40 font-mono mt-1">{s.pterodactyl_identifier ? `id ${s.pterodactyl_identifier}` : "no panel id"}</div>
                </div>
                <button onClick={() => remove(s.id)} className="text-white/40 hover:text-white p-2"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
                <ResourceTile icon={MemoryStick} label="RAM" value={`${s.ram_gb} GB`} />
                <ResourceTile icon={Cpu} label="CPU" value={`${s.cpu_cores}`} />
                <ResourceTile icon={HardDrive} label="Disk" value={`${s.storage_gb} GB`} />
              </div>
              <div className="mt-5 flex justify-end">
                <Link to={`/dashboard/servers/${s.id}`} className="text-xs uppercase tracking-wider border border-white/15 px-4 py-2 hover:bg-white/5 inline-flex items-center gap-1" data-testid={`server-manage-${s.id}`}>
                  Manage <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <CreateServerWizard onClose={() => setOpen(false)} onCreated={() => { setOpen(false); fetchServers(); }} userTier={user?.tier} />}
    </div>
  );
}

function ResourceTile({ icon: Icon, label, value }) {
  return (
    <div className="border border-white/10 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
        <Icon className="w-3 h-3 text-white/40" strokeWidth={1.5} />
      </div>
      <div className="mt-1.5 font-display text-lg">{value}</div>
    </div>
  );
}

// ===================== Create Server Wizard =====================
function CreateServerWizard({ onClose, onCreated, userTier }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [nests, setNests] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [selectedEgg, setSelectedEgg] = useState(null); // { nest, egg }
  const [selectedNode, setSelectedNode] = useState(null);
  const [ram, setRam] = useState(2048);
  const [cpu, setCpu] = useState(100);
  const [disk, setDisk] = useState(5120);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/nests"), api.get("/nodes")]).then(([n, no]) => {
      setNests(n.data || []);
      setNodes(no.data || []);
    }).catch(() => toast.error("Could not load Pterodactyl resources."));
  }, []);

  const allEggs = useMemo(() => {
    const arr = [];
    nests.forEach((nest) => {
      (nest.eggs || []).forEach((egg) => arr.push({ nest, egg }));
    });
    return arr;
  }, [nests]);

  const filteredEggs = useMemo(() => {
    if (!search) return allEggs;
    const q = search.toLowerCase();
    return allEggs.filter(({ nest, egg }) =>
      egg.name?.toLowerCase().includes(q) ||
      nest.name?.toLowerCase().includes(q) ||
      egg.description?.toLowerCase().includes(q)
    );
  }, [allEggs, search]);

  const pickEgg = (item) => {
    setSelectedEgg(item);
    setRam(item.egg.default_ram_mb || 2048);
    setCpu(item.egg.default_cpu_pct || 100);
    setDisk(item.egg.default_disk_mb || 5120);
  };

  const create = async () => {
    setSubmitting(true);
    try {
      await api.post("/servers", {
        name: name.trim(),
        nest_id: selectedEgg.nest.id,
        egg_id: selectedEgg.egg.id,
        node_id: selectedNode.id,
        ram_mb: parseInt(ram),
        cpu_pct: parseInt(cpu),
        disk_mb: parseInt(disk),
      });
      toast.success("Server created. Installing on the node…");
      onCreated();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const canNext1 = name.trim().length > 1;
  const canNext2 = !!selectedEgg;
  const canNext3 = !!selectedNode;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-5xl bg-black border border-white/15 grain my-8" data-testid="create-server-wizard">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ New server</div>
            <h2 className="font-display text-3xl tracking-tighter mt-1">Provision a server</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-2"><X className="w-5 h-5" /></button>
        </div>

        {/* Steps */}
        <div className="px-8 py-4 border-b border-white/10 flex items-center gap-3 overflow-x-auto">
          {[
            { id: 1, label: "Name" },
            { id: 2, label: "Game / Egg" },
            { id: 3, label: "Node" },
            { id: 4, label: "Resources" },
            { id: 5, label: "Confirm" },
          ].map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-2 ${step >= s.id ? "text-white" : "text-white/30"}`}>
                <div className={`w-7 h-7 flex items-center justify-center font-mono text-xs ${step > s.id ? "bg-white text-black" : step === s.id ? "border border-white" : "border border-white/20"}`}>
                  {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span className="text-xs uppercase tracking-wider whitespace-nowrap">{s.label}</span>
              </div>
              {idx < 4 && <div className={`flex-1 h-px ${step > s.id ? "bg-white" : "bg-white/15"}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="p-8 min-h-[400px]">
          {/* Step 1: Name */}
          {step === 1 && (
            <div className="max-w-xl">
              <h3 className="font-display text-2xl">What should we call it?</h3>
              <p className="text-white/50 text-sm mt-1">A short, memorable name. Visible only to you.</p>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-mc-server"
                data-testid="wizard-name"
                className="mt-8 w-full bg-transparent border-b border-white/20 focus:border-white py-4 text-2xl font-display outline-none"
              />
              <p className="text-xs text-white/30 mt-3 font-mono">Tip: avoid spaces. Letters, numbers, hyphens.</p>
            </div>
          )}

          {/* Step 2: Egg */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="font-display text-2xl">Pick a game or runtime</h3>
                  <p className="text-white/50 text-sm mt-1">{userTier === "premium" ? "All eggs are available." : "Free tier eggs shown. Upgrade to unlock more."}</p>
                </div>
                <div className="flex items-center gap-2 border border-white/15 px-3 py-2">
                  <Search className="w-3.5 h-3.5 text-white/40" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search eggs…" className="bg-transparent outline-none text-sm w-40 md:w-56" />
                </div>
              </div>

              {filteredEggs.length === 0 ? (
                <div className="border border-white/10 p-12 text-center bg-[#0a0a0a]">
                  <div className="text-sm text-white/60">No eggs available.</div>
                  <div className="text-xs text-white/40 mt-1">Ask an admin to set up Pterodactyl nests/eggs and tier policies.</div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-2">
                  {filteredEggs.map(({ nest, egg }) => {
                    const isSelected = selectedEgg?.egg.id === egg.id && selectedEgg?.nest.id === nest.id;
                    return (
                      <button
                        key={`${nest.id}-${egg.id}`}
                        onClick={() => pickEgg({ nest, egg })}
                        data-testid={`wizard-egg-${egg.id}`}
                        className={`text-left border p-5 transition-all ${isSelected ? "border-white bg-white/[0.05]" : "border-white/10 bg-[#0a0a0a] hover:border-white/30"}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="text-2xl">{ICON_MAP[egg.icon] || "▪"}</div>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div className="mt-3 font-display text-lg leading-tight">{egg.name}</div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">{nest.name}</div>
                        {egg.description && <div className="text-xs text-white/60 mt-2 line-clamp-2">{egg.description}</div>}
                        <div className="mt-3 text-[10px] font-mono text-white/40">{egg.default_ram_mb || 2048}MB · {egg.default_cpu_pct || 100}% · {egg.default_disk_mb || 5120}MB</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Node */}
          {step === 3 && (
            <div>
              <h3 className="font-display text-2xl">Where do you want it?</h3>
              <p className="text-white/50 text-sm mt-1">Pick a location closest to your players.</p>
              {nodes.length === 0 ? (
                <div className="mt-8 border border-white/10 p-12 text-center bg-[#0a0a0a]">
                  <div className="text-sm text-white/60">No nodes available for your tier.</div>
                  <div className="text-xs text-white/40 mt-1">Ask an admin to add a node policy.</div>
                </div>
              ) : (
                <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {nodes.map((n) => {
                    const isSelected = selectedNode?.id === n.id;
                    return (
                      <button
                        key={n.id}
                        onClick={() => setSelectedNode(n)}
                        data-testid={`wizard-node-${n.id}`}
                        className={`text-left border p-5 transition-all ${isSelected ? "border-white bg-white/[0.05]" : "border-white/10 bg-[#0a0a0a] hover:border-white/30"}`}
                      >
                        <div className="flex items-start justify-between">
                          <Globe className="w-5 h-5 text-white/60" strokeWidth={1.5} />
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div className="mt-3 font-display text-lg">{n.name}</div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1 inline-flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {n.location}</div>
                        <div className="mt-3 text-[10px] font-mono text-white/40 truncate">{n.fqdn}</div>
                        <div className="mt-2 text-[10px] font-mono text-white/40">{n.memory} MB · {n.disk} MB disk</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Resources */}
          {step === 4 && (
            <div className="max-w-2xl">
              <h3 className="font-display text-2xl">Tune the resources</h3>
              <p className="text-white/50 text-sm mt-1">Defaults come from your tier's egg policy. Adjust if you need to.</p>
              <div className="mt-8 space-y-8">
                <Slider icon={MemoryStick} label="RAM" value={ram} setValue={setRam} min={512} max={userTier === "premium" ? 32768 : 4096} step={256} suffix="MB" testid="wizard-ram" />
                <Slider icon={Cpu} label="CPU" value={cpu} setValue={setCpu} min={25} max={userTier === "premium" ? 800 : 200} step={25} suffix="%" testid="wizard-cpu" />
                <Slider icon={HardDrive} label="Disk" value={disk} setValue={setDisk} min={1024} max={userTier === "premium" ? 102400 : 20480} step={512} suffix="MB" testid="wizard-disk" />
              </div>
              {userTier !== "premium" && (
                <div className="mt-8 border border-white/15 bg-white/5 p-4 flex items-start gap-3 text-sm">
                  <Lock className="w-4 h-4 mt-0.5 text-white/60" />
                  <div className="text-white/70">Limits shown are for free tier. <Link to="/dashboard/billing" className="underline">Upgrade</Link> to unlock more.</div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <div className="max-w-2xl">
              <h3 className="font-display text-2xl">Review &amp; provision</h3>
              <div className="mt-8 border border-white/15 bg-[#0a0a0a] divide-y divide-white/10">
                <SummaryRow label="Name" value={name} />
                <SummaryRow label="Game" value={`${selectedEgg?.egg.name} (${selectedEgg?.nest.name})`} icon={ICON_MAP[selectedEgg?.egg?.icon] || "▪"} />
                <SummaryRow label="Node" value={`${selectedNode?.name} · ${selectedNode?.location}`} />
                <SummaryRow label="RAM" value={`${ram} MB`} />
                <SummaryRow label="CPU" value={`${cpu}%`} />
                <SummaryRow label="Disk" value={`${disk} MB`} />
              </div>
              <p className="text-xs text-white/40 mt-4">Provisioning takes about 30–60 seconds. We'll redirect you when it's ready.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-white/10 flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-xs uppercase tracking-wider text-white/50 hover:text-white">Cancel</button>
          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="border border-white/20 px-5 py-2.5 text-sm uppercase tracking-wider hover:bg-white/5 inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2) || (step === 3 && !canNext3)}
                data-testid="wizard-next-btn"
                className="bg-white text-black px-6 py-2.5 text-sm uppercase tracking-wider font-medium hover:bg-white/90 disabled:opacity-40 inline-flex items-center gap-2"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={create}
                disabled={submitting}
                data-testid="wizard-create-btn"
                className="bg-white text-black px-6 py-2.5 text-sm uppercase tracking-wider font-medium hover:bg-white/90 disabled:opacity-40 inline-flex items-center gap-2"
              >
                {submitting ? "Provisioning…" : "Provision server"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, icon }) {
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-3">
      <div className="text-xs uppercase tracking-widest text-white/40">{label}</div>
      <div className="text-sm flex items-center gap-2"><span>{icon}</span> {value}</div>
    </div>
  );
}

function Slider({ icon: Icon, label, value, setValue, min, max, step, suffix, testid }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2">
          <Icon className="w-4 h-4 text-white/50" strokeWidth={1.5} />
          <span className="text-xs uppercase tracking-widest text-white/60">{label}</span>
        </div>
        <div className="font-display text-2xl tracking-tight">{value} <span className="text-sm text-white/40 font-mono">{suffix}</span></div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value))}
        data-testid={testid}
        className="w-full accent-white"
      />
      <div className="flex justify-between text-[10px] font-mono text-white/30 mt-1">
        <span>{min} {suffix}</span><span>{max} {suffix}</span>
      </div>
    </div>
  );
}
