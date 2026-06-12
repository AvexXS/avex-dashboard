import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AuthShell from "./AuthShell";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      toast.success("Welcome back.");
      if (["admin", "staff", "engineer"].includes(res.user.role)) navigate("/admin");
      else navigate("/dashboard");
    } else {
      setError(res.error);
    }
  };

  return (
    <AuthShell
      title="Welcome back."
      subtitle="Sign in to your Avex account."
      footer={
        <span>
          No account?{" "}
          <Link to="/signup" className="text-white border-b border-white/40 hover:border-white" data-testid="login-signup-link">Create one</Link>
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email"
            className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password"
            className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none"
            autoComplete="current-password"
          />
        </div>

        {error && <div className="text-sm text-white border border-white/40 px-4 py-3 bg-white/5" data-testid="login-error">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          data-testid="login-submit-btn"
          className="w-full bg-white text-black px-6 py-4 text-sm uppercase tracking-wider font-medium hover:bg-white/90 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="flex items-center justify-between text-sm text-white/50">
          <Link to="/forgot-password" data-testid="login-forgot-link">Forgot password?</Link>
          <div className="text-xs uppercase tracking-widest text-white/30">SSO via Discord / Google · soon</div>
        </div>
      </form>
    </AuthShell>
  );
}
