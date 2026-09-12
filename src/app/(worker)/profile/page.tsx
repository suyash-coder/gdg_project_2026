/**
 * Worker profile page — /profile
 *
 * Shows and allows editing of the authenticated worker's profile.
 * Uses GET /api/profiles/me and PATCH /api/profiles/me contracts.
 *
 * Protected fields (role, reputation_score, id) are never shown
 * or sent by this page.
 */

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import ProfileForm from "@/components/worker/ProfileForm";

export const metadata = { title: "My Profile — WorkProof" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .single();

  const profile = data as Profile | null;

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>
        My Profile
      </h1>
      {profile && (
        <p
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            marginBottom: "24px",
          }}
        >
          Reputation: <strong>{profile.reputation_score}</strong>{" "}
          (customer-attested jobs)
        </p>
      )}
      {error && (
        <p style={{ color: "var(--danger)", marginBottom: "16px" }}>
          Could not load profile.
        </p>
      )}
      <ProfileForm initialProfile={profile} />
    </div>
  );
}
