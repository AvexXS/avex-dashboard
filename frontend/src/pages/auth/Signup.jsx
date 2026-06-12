import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AuthShell from "./AuthShell";
import { useAuth } from "@/context/AuthContext";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await register(form);
    setLoading(false);
    if (res.ok) {
      toast.success(res.user.is_first_user ? "You're the admin — welcome." : "Account created. Check your email to verify.");
      if (["admin", "staff", "engineer"].includes(res.user.role)) navigate("/admin");
      else navigate("/dashboard");
    } else {
      setError(res.error);
    }
  };

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AuthShell
      title="Create your account."
      subtitle="Get 2 GB RAM, 1 core, 5 GB storage on us — forever."
      footer={
        <span>
          Already have an account?{" "}
          <Link to="/login" className="text-white border-b border-white/40 hover:border-white" data-testid="signup-login-link">Sign in</Link>
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40">Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={upd("name")}
            data-testid="signup-name"
            className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={upd("email")}
            data-testid="signup-email"
            className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={upd("password")}
            data-testid="signup-password"
            className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none"
            autoComplete="new-password"
          />
          <div className="mt-2 text-xs text-white/40">At least 6 characters.</div>
        </div>

        {error && <div className="text-sm text-white border border-white/40 px-4 py-3 bg-white/5" data-testid="signup-error">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          data-testid="signup-submit-btn"
          className="w-full bg-white text-black px-6 py-4 text-sm uppercase tracking-wider font-medium hover:bg-white/90 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Start for free"}
        </button>

        <div className="text-xs text-white/40">
          By signing up, you agree to our <Link to="/legal/terms" className="underline">Terms</Link> and{" "}
          <Link to="/legal/privacy" className="underline">Privacy Policy</Link>.
        </div>
      </form>
    </AuthShell>
  );
}
