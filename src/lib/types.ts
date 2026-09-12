/**
 * WorkProof — Shared TypeScript types.
 *
 * These mirror the database schema exactly.
 * Person 2 (Worker UI) and Person 3 (Customer/Admin UI) import from here.
 */

// ── Enums ───────────────────────────────────────────────────────────

export type UserRole = "worker" | "customer" | "admin";

export type JobStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "disputed"
  | "cancelled";

export type MediaType = "photo" | "video" | "document";

export type AttestationStatus = "pending" | "approved" | "rejected";

export type DisputeStatus =
  | "open"
  | "under_review"
  | "resolved_for_worker"
  | "resolved_for_customer"
  | "dismissed";

export type FlagSeverity = "low" | "medium" | "high" | "critical";

// ── Table row types ─────────────────────────────────────────────────

export interface Profile {
  id: string; // uuid, FK → auth.users
  role: UserRole;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  is_public: boolean;
  reputation_score: number;
  average_rating: number | null;
  rating_count: number;
  repeat_customers: number;
  created_at: string; // ISO timestamp
  updated_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
}

export interface WorkerSkill {
  worker_id: string;
  skill_id: string;
  created_at: string;
}

export interface Job {
  id: string;
  worker_id: string;
  customer_id: string | null;
  title: string;
  description: string | null;
  status: JobStatus;
  location: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobMedia {
  id: string;
  job_id: string;
  uploader_id: string;
  media_type: MediaType;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

export interface VerificationToken {
  id: string;
  job_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface CustomerAttestation {
  id: string;
  job_id: string;
  customer_id: string;
  status: AttestationStatus;
  comment: string | null;
  attested_at: string;
  created_at: string;
}

export interface CustomerPhotoConsent {
  id: string;
  job_id: string;
  customer_id: string;
  consented_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface Dispute {
  id: string;
  job_id: string;
  filed_by: string;
  reason: string;
  status: DisputeStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FraudFlag {
  id: string;
  target_user_id: string;
  flagged_by: string;
  reason: string;
  severity: FlagSeverity;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

// ── Public profile (view) ───────────────────────────────────────────

export interface PublicProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  reputation_score: number;
  average_rating: number | null;
  rating_count: number;
  repeat_customers: number;
}

// ── API response envelope ───────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
