import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "./AuthShell";
import api, { formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password reset. Please log in.");
      navigate("/login");
    } catch (e) {
      setError(formatApiErrorDetail(e?.response?.data?.detail));
    }
  };

  return (
    <AuthShell title="New password" subtitle="Set a new password for your account." footer={<Link to="/login" className="text-white border-b border-white/40 hover:border-white">Back to sign in</Link>}>
      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40">New password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="reset-password"
            className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none"
          />
        </div>
        {error && <div className="text-sm text-white border border-white/40 px-4 py-3 bg-white/5">{error}</div>}
        <button type="submit" data-testid="reset-submit-btn" className="w-full bg-white text-black px-6 py-4 text-sm uppercase tracking-wider hover:bg-white/90">
          Reset password
        </button>
      </form>
    </AuthShell>
  );
}
