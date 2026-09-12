/**
 * Customer dashboard.
 *
 * Route: /customer/dashboard
 *
 * Server Component — reads the Supabase session server-side.
 * Redirects to /customer/login if unauthenticated.
 *
 * Shows the current user's role prominently so that a customer session
 * is visually distinguishable from a worker session.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Profile } from "@/lib/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — WorkProof",
  description: "Your WorkProof customer dashboard.",
};

export default async function CustomerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/customer/login");
  }

  // Fetch profile to show role — uses RLS, only own row is returned
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, display_name, email, city, reputation_score")
    .eq("id", user.id)
    .single();

  const typedProfile = profile as Profile | null;
  const role = typedProfile?.role ?? "unknown";
  const displayName = typedProfile?.display_name ?? user.email ?? "User";
  const isCustomer = role === "customer";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 32px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontWeight: 700, color: "#6366f1", fontSize: 18 }}>
          WorkProof
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            id="session-role-badge"
            style={{
              padding: "4px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background: isCustomer ? "#eff6ff" : "#fefce8",
              color: isCustomer ? "#1d4ed8" : "#92400e",
              border: `1px solid ${isCustomer ? "#bfdbfe" : "#fde68a"}`,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {role}
          </span>
          <form action="/api/auth/logout" method="POST">
            <button
              id="customer-logout-btn"
              type="submit"
              style={{
                padding: "6px 16px",
                background: "transparent",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: "48px auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
          Welcome, {displayName}
        </h1>
        <p style={{ color: "#64748b", fontSize: 15, margin: "0 0 32px" }}>
          {user.email}
        </p>

        {/* Role status card */}
        {isCustomer ? (
          <div
            style={{
              padding: "20px 24px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 12,
              marginBottom: 28,
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: "#1d4ed8" }}>
              ✅ You are logged in as a <strong>Customer</strong>
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#3b82f6" }}>
              You can verify jobs and submit attestations using a worker&apos;s verification link.
            </p>
          </div>
        ) : (
          <div
            style={{
              padding: "20px 24px",
              background: "#fefce8",
              border: "1px solid #fde68a",
              borderRadius: 12,
              marginBottom: 28,
            }}
          >
            <p
              style={{ margin: 0, fontWeight: 600, color: "#92400e", fontSize: 15 }}
            >
              ⚠️ Your role is <strong>{role}</strong> — not yet upgraded to{" "}
              <code
                style={{
                  fontFamily: "monospace",
                  background: "#fff7ed",
                  padding: "1px 5px",
                  borderRadius: 4,
                }}
              >
                customer
              </code>
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#78350f" }}>
              An admin must call{" "}
              <code style={{ fontFamily: "monospace", fontSize: 12 }}>
                POST /api/admin/change-role
              </code>{" "}
              with your user ID{" "}
              <code
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  background: "#fff7ed",
                  padding: "1px 4px",
                  borderRadius: 3,
                }}
              >
                {user.id}
              </code>{" "}
              before you can attest jobs.
            </p>
          </div>
        )}

        {/* Quick links */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          <Link href="/customer/verify/demo-valid" style={actionCard}>
            <span style={{ fontSize: 28 }} aria-hidden>🔍</span>
            <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 15 }}>
              Verify a Token
            </span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              Try: /verify/demo-valid
            </span>
          </Link>
          <Link href="/public/worker" style={actionCard}>
            <span style={{ fontSize: 28 }} aria-hidden>👤</span>
            <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 15 }}>
              Browse Workers
            </span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              Public profiles
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}

const actionCard: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "20px 20px",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  textDecoration: "none",
  transition: "box-shadow 0.15s",
};
