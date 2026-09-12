/**
 * Evidence capture page — /jobs/[id]/evidence
 *
 * Server component: validates job ownership and state before
 * rendering the client-side capture flow.
 *
 * Only accessible for jobs in 'pending' (draft) state.
 * Evidence for completed/attested jobs is read-only.
 */

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";
import EvidencePage from "@/components/worker/EvidencePage";

export const metadata = { title: "Add Evidence — WorkProof" };

export default async function EvidenceCaptureRoute({
  params,
}: PageProps<"/jobs/[id]/evidence">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: jobData, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !jobData) {
    notFound();
  }

  const job = jobData as Job;

  // Only allow evidence for jobs that are pending (draft) or in_progress
  // Evidence for completed/attested jobs is managed by the backend
  if (job.status === "cancelled") {
    redirect(`/jobs/${id}`);
  }

  if (job.status === "completed" || job.status === "disputed") {
    // Still show the page but in read-only mode
    return (
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "24px 16px" }}>
        <p style={{ color: "var(--muted)", fontSize: "14px" }}>
          Evidence cannot be added to a {job.status} job.
        </p>
      </div>
    );
  }

  return <EvidencePage job={job} />;
}
