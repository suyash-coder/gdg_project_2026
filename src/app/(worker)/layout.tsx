/**
 * Worker route group layout.
 *
 * All pages under (worker)/ require authentication.
 * Server-side auth check: if no user, redirect to /login.
 * Renders a mobile-first navigation shell for authenticated workers.
 *
 * Note: LayoutProps is only generated for the root layout route ("/").
 * Sub-group layouts must use an explicit children prop type.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkerNav from "@/components/worker/WorkerNav";

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
      }}
    >
      <main
        style={{
          flex: 1,
          paddingBottom: "calc(var(--nav-height) + 16px)",
        }}
      >
        {children}
      </main>
      <WorkerNav />
    </div>
  );
}
