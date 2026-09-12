/**
 * Create job page — /jobs/new
 *
 * Uses the existing POST /api/jobs contract.
 * Newly created jobs begin in 'pending' (draft) state.
 * No evidence fields in Phase 1.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JobForm from "@/components/worker/JobForm";

export const metadata = { title: "Add Work — WorkProof" };

export default async function NewJobPage() {
  // Auth guard (belt + suspenders — worker layout already handles this)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px" }}>
        Add Work
      </h1>
      <p
        style={{
          fontSize: "14px",
          color: "var(--muted)",
          marginBottom: "24px",
        }}
      >
        Record a job you&apos;ve done. You can save as draft and complete it
        later.
      </p>
      <JobForm />
    </div>
  );
}
