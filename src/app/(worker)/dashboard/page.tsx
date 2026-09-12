/**
 * Worker dashboard — /dashboard
 *
 * Shows authoritative data from the backend only:
 * - Profile completion state
 * - Reputation score (from backend, not calculated locally)
 * - Customer-attested job count (from attestations API)
 * - Recent jobs
 *
 * All data is fetched server-side using the session cookie.
 * No fake counters or locally-calculated reputation values.
 */

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Job, Profile } from "@/lib/types";
import ShareProfile from "@/components/worker/ShareProfile";

export const metadata = {
  title: "Dashboard — WorkProof",
};

function profileCompletionFields(profile: Profile) {
  const fields = [
    { label: "Name", done: Boolean(profile.display_name) },
    { label: "Bio", done: Boolean(profile.bio) },
    { label: "City", done: Boolean(profile.city) },
    { label: "Photo", done: Boolean(profile.avatar_url) },
  ];
  const done = fields.filter((f) => f.done).length;
  return { fields, done, total: fields.length };
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch profile — RLS guarantees this is the authenticated user's row
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch profile — explicitly scoping to the authenticated user's ID
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id || "")
    .single();

  // Fetch recent jobs — RLS-scoped to this worker
  const { data: jobsData } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch attestations for this worker's jobs to get attested count
  const { data: attestationsData } = await supabase
    .from("customer_attestations")
    .select("id, status, job_id, jobs(worker_id)")
    .eq("status", "approved");

  const profile = profileData as Profile | null;
  const jobs = (jobsData ?? []) as Job[];
  const approvedAttestations = attestationsData ?? [];

  if (profileError || !profile) {
    return (
      <div style={styles.container}>
        <p style={styles.errorText}>Could not load profile. Please try again. ({profileError?.message || 'No profile'})</p>
      </div>
    );
  }

  const completion = profileCompletionFields(profile);
  const completionPct = Math.round((completion.done / completion.total) * 100);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.greeting}>
            Hi, {profile.display_name ?? "Worker"} 👋
          </h1>
          <p style={styles.subtitle}>WorkProof Dashboard</p>
        </div>
        <Link href="/jobs/new" style={styles.addBtn} id="add-work-btn">
          + Add Work
        </Link>
      </div>

      {/* Profile completion */}
      {completionPct < 100 && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Complete Your Profile</h2>
          <div style={styles.progressBar}>
            <div
              style={{ ...styles.progressFill, width: `${completionPct}%` }}
            />
          </div>
          <p style={styles.progressLabel}>{completionPct}% complete</p>
          <ul style={styles.checklist}>
            {completion.fields.map((f) => (
              <li key={f.label} style={styles.checklistItem}>
                <span style={{ color: f.done ? "var(--success)" : "var(--muted)" }}>
                  {f.done ? "✓" : "○"}
                </span>{" "}
                {f.label}
              </li>
            ))}
          </ul>
          <Link href="/profile" style={styles.linkBtn} id="edit-profile-link">
            Edit Profile →
          </Link>
        </div>
      )}

      {/* Stats row — authoritative backend values only */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <span style={styles.statNumber}>{profile.reputation_score}</span>
          <span style={styles.statLabel}>Reputation</span>
          <span style={styles.statNote}>(customer-attested)</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statNumber}>{approvedAttestations.length}</span>
          <span style={styles.statLabel}>Attested Jobs</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statNumber}>{jobs.length}</span>
          <span style={styles.statLabel}>Total Jobs</span>
        </div>
      </div>
      
      {/* Extended Reputation Metrics — Missing from Backend */}
      <div style={styles.extendedStatsRow}>
        <div style={styles.unavailableStatCard}>
          <span style={styles.unavailableIcon}>—</span>
          <span style={styles.statLabel}>Average Rating</span>
          <span style={styles.unavailableNote}>Not provided by backend</span>
        </div>
        <div style={styles.unavailableStatCard}>
          <span style={styles.unavailableIcon}>—</span>
          <span style={styles.statLabel}>Repeat Customers</span>
          <span style={styles.unavailableNote}>Not provided by backend</span>
        </div>
      </div>

      {/* Phase 5 Integration: Share Profile Controls */}
      <ShareProfile workerId={profile.id} />

      {/* Recent jobs */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Recent Jobs</h2>
          <Link href="/jobs" style={styles.seeAll} id="see-all-jobs-link">
            See All
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No jobs yet.</p>
            <Link href="/jobs/new" style={styles.primaryBtn} id="create-first-job-btn">
              Create Your First Job
            </Link>
          </div>
        ) : (
          <ul style={styles.jobList}>
            {jobs.map((job) => (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} style={styles.jobRow} id={`job-${job.id}`}>
                  <div>
                    <p style={styles.jobTitle}>{job.title}</p>
                    <p style={styles.jobMeta}>
                      {job.location ?? "No location"} ·{" "}
                      {new Date(job.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <StatusBadge status={job.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: "Draft", color: "var(--muted)" },
    in_progress: { label: "In Progress", color: "var(--warning)" },
    completed: { label: "Completed", color: "var(--success)" },
    disputed: { label: "Disputed", color: "var(--danger)" },
    cancelled: { label: "Cancelled", color: "var(--muted)" },
  };
  const s = map[status] ?? { label: status, color: "var(--muted)" };
  return (
    <span
      style={{
        fontSize: "12px",
        fontWeight: "600",
        color: s.color,
        border: `1px solid ${s.color}`,
        borderRadius: "var(--radius-sm)",
        padding: "2px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "560px",
    margin: "0 auto",
    padding: "24px 16px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
  },
  greeting: { fontSize: "20px", fontWeight: "700" },
  subtitle: { fontSize: "13px", color: "var(--muted)", marginTop: "2px" },
  addBtn: {
    display: "inline-block",
    background: "var(--primary)",
    color: "var(--primary-fg)",
    padding: "10px 16px",
    borderRadius: "var(--radius)",
    fontSize: "14px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  card: {
    background: "var(--muted-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "16px",
    marginBottom: "16px",
  },
  cardTitle: { fontSize: "15px", fontWeight: "600", marginBottom: "12px" },
  progressBar: {
    height: "8px",
    background: "var(--border)",
    borderRadius: "4px",
    overflow: "hidden",
    marginBottom: "6px",
  },
  progressFill: {
    height: "100%",
    background: "var(--primary)",
    borderRadius: "4px",
    transition: "width 0.3s",
  },
  progressLabel: { fontSize: "12px", color: "var(--muted)", marginBottom: "12px" },
  checklist: { listStyle: "none", marginBottom: "12px" },
  checklistItem: { fontSize: "13px", marginBottom: "4px" },
  linkBtn: { fontSize: "13px", color: "var(--primary)", fontWeight: "500" },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginBottom: "12px",
  },
  extendedStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "8px",
    marginBottom: "24px",
  },
  statCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "16px 8px",
    background: "var(--muted-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
  },
  unavailableStatCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "12px 8px",
    background: "rgba(0, 0, 0, 0.02)",
    border: "1px dashed var(--border)",
    borderRadius: "var(--radius)",
    opacity: 0.8,
  },
  statNumber: { fontSize: "28px", fontWeight: "700" },
  unavailableIcon: { fontSize: "20px", fontWeight: "700", color: "var(--muted)", marginBottom: "4px" },
  statLabel: { fontSize: "11px", color: "var(--muted)", marginTop: "2px" },
  statNote: { fontSize: "9px", color: "var(--muted)", textAlign: "center" },
  unavailableNote: { fontSize: "9px", color: "var(--danger)", textAlign: "center", marginTop: "2px" },
  section: {},
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  sectionTitle: { fontSize: "16px", fontWeight: "600" },
  seeAll: { fontSize: "13px", color: "var(--primary)" },
  emptyState: { textAlign: "center", padding: "32px 16px" },
  emptyText: { color: "var(--muted)", marginBottom: "16px" },
  primaryBtn: {
    display: "inline-block",
    background: "var(--primary)",
    color: "var(--primary-fg)",
    padding: "12px 24px",
    borderRadius: "var(--radius)",
    fontSize: "15px",
    fontWeight: "600",
  },
  jobList: { listStyle: "none", display: "flex", flexDirection: "column", gap: "1px" },
  jobRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid var(--border)",
  },
  jobTitle: { fontSize: "14px", fontWeight: "500", marginBottom: "2px" },
  jobMeta: { fontSize: "12px", color: "var(--muted)" },
  errorText: { color: "var(--danger)" },
};
