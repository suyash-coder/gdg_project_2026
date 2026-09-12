/**
 * Zod validation schemas for API input validation.
 *
 * Every API route validates incoming data against these schemas
 * before touching the database. Exported for re-use in tests.
 */

import { z } from "zod";

// ── Auth ────────────────────────────────────────────────────────────

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name too long")
    .optional(),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ── Profile ─────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  display_name: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().max(2048).optional().nullable(),
  city: z.string().max(100).optional(),
  is_public: z.boolean().optional(),
});

// Disallowed fields — clients CANNOT update these
export const PROFILE_PROTECTED_FIELDS = [
  "id",
  "role",
  "reputation_score",
  "created_at",
  "updated_at",
] as const;

// ── Job ─────────────────────────────────────────────────────────────

export const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  customer_id: z.string().uuid().optional().nullable(),
});

export const updateJobSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z
    .enum(["pending", "in_progress", "completed", "disputed", "cancelled"])
    .optional(),
  location: z.string().max(200).optional(),
});

// Disallowed fields — clients CANNOT update these
export const JOB_PROTECTED_FIELDS = [
  "id",
  "worker_id",
  "customer_id",
  "created_at",
  "updated_at",
] as const;

// ── Attestation ─────────────────────────────────────────────────────

export const createAttestationSchema = z.object({
  job_id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  rating: z.number().int().min(1).max(5).optional(),
  review: z.string().max(1000).optional(),
  comment: z.string().max(1000).optional(),
  token: z.string().min(10, "Token is required"),
});



// ── Dispute ─────────────────────────────────────────────────────────

export const createDisputeSchema = z.object({
  job_id: z.string().uuid(),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(2000),
});

export const resolveDisputeSchema = z.object({
  status: z.enum([
    "resolved_for_worker",
    "resolved_for_customer",
    "dismissed",
  ]),
});

// ── Fraud flag ──────────────────────────────────────────────────────

export const createFraudFlagSchema = z.object({
  target_user_id: z.string().uuid(),
  reason: z.string().min(10).max(2000),
  severity: z.enum(["low", "medium", "high", "critical"]),
});

// ── Media ───────────────────────────────────────────────────────────

export const uploadMediaSchema = z.object({
  job_id: z.string().uuid(),
  media_type: z.enum(["photo", "video", "document"]),
  caption: z.string().max(500).optional(),
  sha256: z.string().length(64).optional(),
  perceptual_hash: z.string().min(1).max(256).optional(),
});

// ── Photo consent ───────────────────────────────────────────────────

export const createPhotoConsentSchema = z.object({
  consent: z.boolean(),
});

// ── Pagination ──────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Admin role change ───────────────────────────────────────────────

export const changeRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["worker", "customer", "admin"]),
});
