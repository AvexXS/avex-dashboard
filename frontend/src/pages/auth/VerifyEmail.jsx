import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import AuthShell from "./AuthShell";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("missing");
      return;
    }
    api.post("/auth/verify-email", { token })
      .then(() => setStatus("ok"))
      .catch((e) => {
        setError(formatApiErrorDetail(e?.response?.data?.detail));
        setStatus("error");
      });
  }, [token]);

  return (
    <AuthShell title="Email verification" subtitle="">
      <div data-testid="verify-status" className="space-y-6">
        {status === "checking" && <p className="text-white/60">Verifying your email…</p>}
        {status === "ok" && (
          <>
            <p className="text-white">Your email has been verified.</p>
            <Link to="/dashboard" className="inline-block bg-white text-black px-6 py-3 text-sm uppercase tracking-wider hover:bg-white/90">
              Go to dashboard
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-white">We couldn't verify this link.</p>
            <p className="text-white/40 text-sm">{error}</p>
            <Link to="/" className="text-white underline">Back to home</Link>
          </>
        )}
        {status === "missing" && (
          <p className="text-white/60">No verification token provided.</p>
        )}
      </div>
    </AuthShell>
  );
}
