/**
 * Customer login page.
 *
 * Route: /customer/login
 *
 * Client Component — handles form state and calls POST /api/auth/login.
 * On success, reads the session role from /api/profiles/me to show it in
 * the dashboard, making customer vs worker sessions distinguishable.
 */

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInCustomer } from "@/lib/customer/auth";
import Link from "next/link";

type Phase = "form" | "submitting" | "error";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPhase("submitting");

    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string).trim();
    const password = fd.get("password") as string;

    const result = await signInCustomer(email, password);

    if (result.ok) {
      // Session cookie is set by the server via @supabase/ssr.
      // Redirect to dashboard where role is fetched and shown.
      router.push("/customer/dashboard");
    } else {
      setErrorMsg(result.error);
      setPhase("error");
    }
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 28 }}>
          <Link href="/" style={{ fontSize: 13, color: "#6366f1", textDecoration: "none" }}>
            ← WorkProof
          </Link>
          <h1 style={{ ...heading, marginTop: 12 }}>Customer log in</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
            No account yet?{" "}
            <Link href="/customer/signup" style={linkStyle}>
              Sign up
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={fieldGroup}>
            <label htmlFor="customer-login-email" style={label}>
              Email address
            </label>
            <input
              id="customer-login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              style={input}
              placeholder="you@example.com"
            />
          </div>

          <div style={fieldGroup}>
            <label htmlFor="customer-login-password" style={label}>
              Password
            </label>
            <input
              id="customer-login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={input}
              placeholder="Your password"
            />
          </div>

          {phase === "error" && (
            <div style={errorBox} role="alert">
              {errorMsg}
            </div>
          )}

          <button
            id="customer-login-submit"
            type="submit"
            disabled={phase === "submitting"}
            style={{
              ...primaryBtn,
              width: "100%",
              marginTop: 8,
              opacity: phase === "submitting" ? 0.7 : 1,
              cursor: phase === "submitting" ? "wait" : "pointer",
            }}
          >
            {phase === "submitting" ? "Signing in…" : "Log in"}
          </button>
        </form>
      </div>
    </main>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f8fafc",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
  fontFamily: "'Segoe UI', system-ui, sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
  background: "#ffffff",
  borderRadius: 16,
  boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
  padding: "36px 40px",
};

const heading: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: "#1e293b",
  margin: 0,
};

const fieldGroup: React.CSSProperties = { marginBottom: 18 };

const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

const input: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 14px",
  fontSize: 15,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
  color: "#1e293b",
};

const primaryBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 24px",
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = {
  color: "#6366f1",
  textDecoration: "none",
  fontWeight: 600,
};

const errorBox: React.CSSProperties = {
  marginBottom: 16,
  padding: "12px 14px",
  background: "#fff1f2",
  border: "1px solid #fecdd3",
  borderRadius: 8,
  fontSize: 14,
  color: "#9f1239",
};
