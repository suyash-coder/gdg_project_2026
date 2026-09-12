/**
 * Public worker profile page.
 *
 * Route: /public/worker/[id]
 *
 * Server Component — queries `public_profiles` view directly.
 * Only renders fields that the view exposes (contract-approved public fields).
 * Returns 404 if the worker doesn't exist or has is_public = false.
 */

import { notFound } from "next/navigation";
import { WorkerProfileCard } from "@/components/public/WorkerProfileCard";
import { getPublicProfile } from "@/lib/public/profiles";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPublicProfile(id);

  return {
    title: profile
      ? `${profile.display_name ?? "Worker"} — WorkProof`
      : "Worker Not Found — WorkProof",
    description: profile?.bio
      ? profile.bio.slice(0, 160)
      : "Verified worker profile on WorkProof.",
  };
}

export default async function WorkerPublicProfilePage({ params }: Props) {
  const { id } = await params;
  const profile = await getPublicProfile(id);

  if (!profile) {
    notFound();
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "0 16px" }}>
      <WorkerProfileCard profile={profile} />
    </main>
  );
}
