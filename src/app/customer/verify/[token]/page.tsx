/**
 * Verification token page.
 *
 * Route: /customer/verify/[token]
 *
 * Server Component — resolves the token via GET /api/verify/[token] and
 * passes the result to TokenResult (Client Component) for rendering.
 *
 * Three states from the real endpoint:
 *   valid    → job details + attestation form + photo consent step
 *   consumed → already-used notice
 *   invalid  → clean error state (not found / expired / rate limited)
 */

import { TokenResult } from "@/components/customer/TokenResult";
import { resolveToken } from "@/lib/customer/tokens";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const state = await resolveToken(token);
  const title =
    state.status === "valid"
      ? `Verify: ${state.job.title} — WorkProof`
      : "Verification — WorkProof";
  return { title, description: "Verify a WorkProof job token." };
}

export default async function VerifyTokenPage({ params }: Props) {
  const { token } = await params;
  const tokenState = await resolveToken(token);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "0 16px",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Minimal nav */}
      <header
        style={{
          padding: "16px 0",
          maxWidth: 600,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 700,
            color: "#6366f1",
            fontSize: 16,
            textDecoration: "none",
          }}
        >
          WorkProof
        </Link>
        <Link
          href="/customer/dashboard"
          style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}
        >
          Dashboard
        </Link>
      </header>

      <TokenResult tokenState={tokenState} rawToken={token} />
    </main>
  );
}
