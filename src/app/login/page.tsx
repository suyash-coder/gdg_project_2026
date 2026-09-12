/**
 * Login page — allows workers to sign in or sign up.
 *
 * If the user is already authenticated, redirect to /dashboard
 * so they don't see the login form again.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/worker/LoginForm";

export const metadata = {
  title: "Sign In — WorkProof",
  description: "Sign in to your WorkProof account",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "var(--background)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "700",
            marginBottom: "8px",
            color: "var(--foreground)",
          }}
        >
          WorkProof
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--muted)",
            marginBottom: "32px",
          }}
        >
          Your portable work history
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
