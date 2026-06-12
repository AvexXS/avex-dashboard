import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "./AuthShell";
import api, { formatApiErrorDetail } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (e) {
      setError(formatApiErrorDetail(e?.response?.data?.detail));
    }
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="We'll send a reset link to your email."
      footer={<Link to="/login" className="text-white border-b border-white/40 hover:border-white">Back to sign in</Link>}
    >
      {sent ? (
        <div className="text-white/70" data-testid="forgot-sent">
          If an account exists for <span className="text-white font-mono">{email}</span>, you'll receive a reset link shortly.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="forgot-email"
              className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none"
            />
          </div>
          {error && <div className="text-sm text-white border border-white/40 px-4 py-3 bg-white/5">{error}</div>}
          <button type="submit" data-testid="forgot-submit-btn" className="w-full bg-white text-black px-6 py-4 text-sm uppercase tracking-wider hover:bg-white/90">
            Send reset link
          </button>
        </form>
      )}
    </AuthShell>
  );
}
