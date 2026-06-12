import React from "react";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, Mail, User as UserIcon, Shield } from "lucide-react";

export default function Account() {
  const { user } = useAuth();

  return (
    <div className="space-y-10">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Account</div>
        <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Profile &amp; settings</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-px bg-white/10 border border-white/10">
        <Field icon={UserIcon} label="Name" value={user?.name} />
        <Field icon={Mail} label="Email" value={user?.email} />
        <Field icon={Shield} label="Role" value={user?.role} />
        <Field icon={CheckCircle2} label="Email verified" value={user?.email_verified ? "Yes" : "No"} />
      </div>

      <div className="border border-white/10 p-6 bg-[#0a0a0a]">
        <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Linked accounts</div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="border border-white/10 px-3 py-1.5 uppercase tracking-wider text-white/40">Discord — admin to enable</span>
          <span className="border border-white/10 px-3 py-1.5 uppercase tracking-wider text-white/40">Google — admin to enable</span>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value }) {
  return (
    <div className="bg-black p-6">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-white/40">{label}</div>
        <Icon className="w-4 h-4 text-white/40" strokeWidth={1.5} />
      </div>
      <div className="font-display text-2xl mt-2 break-all">{value}</div>
    </div>
  );
}
