import React from "react";
import { Link } from "react-router-dom";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left side - form */}
      <div className="flex-1 flex flex-col p-8 md:p-12">
        <Link to="/" className="font-display text-2xl font-light tracking-tighter inline-block" data-testid="auth-back-home">
          AVEX<span className="text-white/30">.</span>
        </Link>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">/ {title.split(" ")[0]}</div>
            <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter">{title}</h1>
            {subtitle && <p className="mt-4 text-white/50 text-sm">{subtitle}</p>}
            <div className="mt-10">{children}</div>
            {footer && <div className="mt-8 text-sm text-white/50">{footer}</div>}
          </div>
        </div>
        <div className="text-xs uppercase tracking-widest text-white/30 font-mono">avex.click</div>
      </div>

      {/* Right side - art panel */}
      <div className="hidden md:block flex-1 relative border-l border-white/10 overflow-hidden bg-[#050505]">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-12">
            <div className="text-[20rem] leading-none font-display font-thin tracking-tighter text-white/[0.04] select-none">A</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="font-mono text-xs uppercase tracking-widest text-white/40 mb-6">// console</div>
                <div className="font-mono text-sm text-white/60 text-left space-y-1.5 bg-black/40 border border-white/10 p-6">
                  <div><span className="text-white/30">$</span> avex login --secure</div>
                  <div className="text-white/40">→ authenticating ssl handshake</div>
                  <div className="text-white/40">→ verifying credentials</div>
                  <div><span className="text-white">✓ welcome back</span></div>
                  <div className="text-white/40">→ launching dashboard...</div>
                  <div className="text-white">_<span className="cursor-blink">|</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
