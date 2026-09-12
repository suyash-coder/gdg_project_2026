/**
 * Customer sign-up page.
 *
 * Route: /customer/signup
 *
 * Client Component — handles form state and calls POST /api/auth/signup.
 *
 * CONTRACT NOTE: Signup always creates a worker role (DB trigger).
 * An admin must call POST /api/admin/change-role to upgrade to 'customer'.
 * This limitation is shown to the user after successful signup.
 */

"use client";

import { useState, type FormEvent } from "react";
import { signUpCustomer } from "@/lib/customer/auth";
import Link from "next/link";

type Phase = "form" | "submitting" | "success" | "error";

export default function CustomerSignupPage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [successEmail, setSuccessEmail] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPhase("submitting");

    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string).trim();
    const password = fd.get("password") as string;
    const displayName = (fd.get("display_name") as string).trim() || undefined;

    const result = await signUpCustomer(email, password, displayName);

    if (result.ok) {
      setSuccessEmail(result.email);
      setPhase("success");
    } else {
      setErrorMsg(result.error);
      setPhase("error");
    }
  }

  if (phase === "success") {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <span style={{ fontSize: 48 }} aria-hidden>✅</span>
          <h1 style={heading}>Account Created</h1>
          <p style={{ color: "#374151", fontSize: 15, lineHeight: 1.6, marginBottom: 0 }}>
            Your account (<strong>{successEmail}</strong>) has been created
            successfully.
          </p>

          {/* Role-upgrade notice — contract gap 3 */}
          <div style={noticeBox}>
            <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#92400e", fontSize: 14 }}>
              ⚠️ Role Notice — Action Required
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#78350f", lineHeight: 1.6 }}>
              Your account was created with role{" "}
              <code style={inlineCode}>worker</code>. The WorkProof platform
              requires an administrator to upgrade your role to{" "}
              <code style={inlineCode}>customer</code> before you can attest
              jobs.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#92400e" }}>
              <strong>Admin:</strong> call{" "}
              <code style={inlineCode}>POST /api/admin/change-role</code> with{" "}
              <code style={inlineCode}>
                {`{ "user_id": "<your-id>", "role": "customer" }`}
              </code>
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <Link href="/customer/login" style={primaryBtn}>
              Log in now
            </Link>
            <Link href="/" style={ghostBtn}>
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/"
            style={{ fontSize: 13, color: "#6366f1", textDecoration: "none" }}
          >
            ← WorkProof
          </Link>
          <h1 style={{ ...heading, marginTop: 12 }}>Create customer account</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
            Already have an account?{" "}
            <Link href="/customer/login" style={linkStyle}>
              Log in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={fieldGroup}>
            <label htmlFor="customer-signup-display-name" style={label}>
              Display name <span style={{ color: "#94a3b8" }}>(optional)</span>
            </label>
            <input
              id="customer-signup-display-name"
              name="display_name"
              type="text"
              autoComplete="name"
              maxLength={100}
              style={input}
              placeholder="Your full name"
            />
          </div>

          <div style={fieldGroup}>
            <label htmlFor="customer-signup-email" style={label}>
              Email address
            </label>
            <input
              id="customer-signup-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              style={input}
              placeholder="you@example.com"
            />
          </div>

          <div style={fieldGroup}>
            <label htmlFor="customer-signup-password" style={label}>
              Password
            </label>
            <input
              id="customer-signup-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              style={input}
              placeholder="Min 8 characters"
            />
          </div>

          {phase === "error" && (
            <div style={errorBox} role="alert">
              {errorMsg}
            </div>
          )}

          <button
            id="customer-signup-submit"
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
            {phase === "submitting" ? "Creating account…" : "Create account"}
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

const fieldGroup: React.CSSProperties = {
  marginBottom: 18,
};

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
  textDecoration: "none",
  textAlign: "center",
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 24px",
  background: "transparent",
  color: "#64748b",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  textDecoration: "none",
};

const linkStyle: React.CSSProperties = {
  color: "#6366f1",
  textDecoration: "none",
  fontWeight: 600,
};

const noticeBox: React.CSSProperties = {
  marginTop: 20,
  padding: "14px 16px",
  background: "#fefce8",
  border: "1px solid #fde68a",
  borderRadius: 10,
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

const inlineCode: React.CSSProperties = {
  fontFamily: "monospace",
  background: "#fff7ed",
  padding: "1px 4px",
  borderRadius: 4,
  fontSize: "0.9em",
};
