"use client";

/**
 * LoginForm — handles worker sign-in and sign-up.
 *
 * Calls POST /api/auth/login and POST /api/auth/signup.
 * Validates using signUpSchema / signInSchema from the shared contract.
 * On success, redirects to /dashboard via window.location (server redirect
 * would require a route handler; this is client-side navigation after auth).
 *
 * Handles: loading, invalid credentials, signup errors,
 * already-authenticated redirect.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpSchema, signInSchema } from "@/lib/validation/schemas";

type Mode = "login" | "signup";

interface FieldError {
  email?: string;
  password?: string;
  display_name?: string;
  general?: string;
}

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(): boolean {
    const schema = mode === "login" ? signInSchema : signUpSchema;
    const payload =
      mode === "login"
        ? { email, password }
        : { email, password, display_name: displayName || undefined };

    const result = schema.safeParse(payload);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setErrors({
        email: flat.email?.[0],
        password: flat.password?.[0],
        display_name: (flat as Record<string, string[] | undefined>).display_name?.[0],
      });
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, display_name: displayName || undefined };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Success — refresh server data then navigate to dashboard.
      // router.refresh() flushes the new session cookie into server components.
      router.refresh();
      router.push("/dashboard");
    } catch {
      setServerError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={styles.form} id="auth-form">
      {mode === "signup" && (
        <div style={styles.field}>
          <label htmlFor="display_name" style={styles.label}>
            Full Name
          </label>
          <input
            id="display_name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            style={{
              ...styles.input,
              ...(errors.display_name ? styles.inputError : {}),
            }}
            autoComplete="name"
            disabled={loading}
          />
          {errors.display_name && (
            <span style={styles.errorMsg} role="alert">
              {errors.display_name}
            </span>
          )}
        </div>
      )}

      <div style={styles.field}>
        <label htmlFor="email" style={styles.label}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="worker@example.com"
          style={{
            ...styles.input,
            ...(errors.email ? styles.inputError : {}),
          }}
          autoComplete="email"
          inputMode="email"
          disabled={loading}
          required
        />
        {errors.email && (
          <span style={styles.errorMsg} role="alert">
            {errors.email}
          </span>
        )}
      </div>

      <div style={styles.field}>
        <label htmlFor="password" style={styles.label}>
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
          style={{
            ...styles.input,
            ...(errors.password ? styles.inputError : {}),
          }}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          disabled={loading}
          required
        />
        {errors.password && (
          <span style={styles.errorMsg} role="alert">
            {errors.password}
          </span>
        )}
      </div>

      {serverError && (
        <div style={styles.serverError} role="alert" id="auth-error">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
        disabled={loading}
        id="auth-submit-btn"
        aria-busy={loading}
      >
        {loading
          ? mode === "login"
            ? "Signing in…"
            : "Creating account…"
          : mode === "login"
            ? "Sign In"
            : "Create Account"}
      </button>

      <div style={styles.switchRow}>
        <span style={{ fontSize: "14px", color: "var(--muted)" }}>
          {mode === "login" ? "New to WorkProof?" : "Already have an account?"}
        </span>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setErrors({});
            setServerError(null);
          }}
          style={styles.switchBtn}
          id="auth-mode-switch"
        >
          {mode === "login" ? "Create Account" : "Sign In"}
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "14px", fontWeight: "500", color: "var(--foreground)" },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "16px", // 16px prevents iOS zoom
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--background)",
    color: "var(--foreground)",
    outline: "none",
    appearance: "none",
  },
  inputError: { borderColor: "var(--danger)" },
  errorMsg: { fontSize: "12px", color: "var(--danger)" },
  serverError: {
    padding: "12px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "var(--radius)",
    fontSize: "14px",
    color: "var(--danger)",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    background: "var(--primary)",
    color: "var(--primary-fg)",
    border: "none",
    borderRadius: "var(--radius)",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    minHeight: "48px",
  },
  switchRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    paddingTop: "8px",
  },
  switchBtn: {
    background: "none",
    border: "none",
    color: "var(--primary)",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    padding: 0,
  },
};
