/**
 * Job edit page — /jobs/[id]/edit
 *
 * Only accessible for jobs in 'pending' (draft) status.
 * Uses existing PATCH /api/jobs/[id] contract.
 */

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";
import JobForm from "@/components/worker/JobForm";

export const metadata = { title: "Edit Job — WorkProof" };

export default async function JobEditPage({
  params,
}: PageProps<"/jobs/[id]/edit">) {
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

  // Only allow editing draft jobs
  if (job.status !== "pending") {
    redirect(`/jobs/${id}`);
  }

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px" }}>
        Edit Job
      </h1>
      <JobForm existingJob={job} />
    </div>
  );
}
