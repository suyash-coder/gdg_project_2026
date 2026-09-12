/**
 * evidence-types.ts
 *
 * Worker 2 — Evidence domain types.
 *
 * These are client-side only types used by the evidence capture/processing
 * pipeline. They do NOT duplicate shared @/lib/types — they extend them
 * with UI/processing concerns.
 */

// ── Evidence step in the capture flow ──────────────────────────────

export type EvidenceSlot = "before" | "after";

export const EVIDENCE_SLOTS: EvidenceSlot[] = ["before", "after"];

export const MAX_EVIDENCE_IMAGES = 2;

// ── Image processing constraints ───────────────────────────────────

export const MAX_IMAGE_BYTES = 1_048_576; // 1 MB
export const MAX_DIMENSION = 1920; // max width or height after resize
export const JPEG_QUALITY = 0.82; // JPEG compression quality
/** Accepted MIME types (before and after magic-byte check) */
export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/webp"] as const;
export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

/** JPEG magic bytes: FF D8 FF */
export const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const;
/** WebP magic bytes: RIFF ????  WEBP */
export const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46] as const; // "RIFF"
export const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50] as const; // "WEBP" at offset 8

// ── Processed evidence result ───────────────────────────────────────

export interface ProcessedEvidence {
  /** The final blob that will be uploaded — this is what is hashed */
  blob: Blob;
  /** MIME type of the blob (always image/jpeg or image/webp) */
  mimeType: AcceptedMimeType;
  /** SHA-256 hex digest of blob bytes — corresponds exactly to uploaded bytes */
  sha256: string;
  /**
   * Perceptual hash (dHash, 64-bit hex) for near-duplicate detection.
   * Used as a signal only — not proof of anything.
   */
  perceptualHash: string;
  /** Final width in pixels */
  width: number;
  /** Final height in pixels */
  height: number;
  /** Final size in bytes */
  sizeBytes: number;
}

// ── UI state machine ───────────────────────────────────────────────

export type EvidenceUIState =
  | "idle" // initial — nothing captured yet
  | "requesting_camera" // getUserMedia in progress
  | "capturing" // camera live, waiting for user to take photo
  | "reviewing" // frame captured, user can confirm or retake
  | "processing" // running resize/compress/hash pipeline
  | "ready" // processed evidence ready, awaiting explicit submit
  | "uploading" // upload in progress (pending Worker 1 endpoint)
  | "success" // upload confirmed by backend
  | "error"; // something failed — see EvidenceError

// ── Error taxonomy ─────────────────────────────────────────────────

export type EvidenceErrorKind =
  | "camera_permission_denied"
  | "camera_unavailable"
  | "browser_unsupported"
  | "invalid_image"
  | "image_too_large"
  | "processing_failed"
  | "network_failure"
  | "upload_failure"
  | "invalid_job_state"
  | "upload_endpoint_unavailable"; // honest: endpoint not yet deployed

export interface EvidenceError {
  kind: EvidenceErrorKind;
  message: string;
  retryable: boolean;
}

// ── Upload adapter interface ───────────────────────────────────────

/**
 * The shape that the Worker-2-owned upload adapter accepts.
 * This is the boundary between client processing and the backend.
 * The backend endpoint (POST /api/jobs/[id]/media) is not yet available —
 * the adapter function will return UPLOAD_ENDPOINT_UNAVAILABLE until
 * Worker 1 provides the confirmed route.
 */
export interface EvidenceUploadRequest {
  jobId: string;
  evidenceType: EvidenceSlot; // "before" | "after"
  file: Blob;
  sha256: string;
  perceptualHash: string;
  mimeType: AcceptedMimeType;
}

export type UploadResult =
  | { ok: true; mediaId: string }
  | { ok: false; error: EvidenceError };

// ── Draft recovery ─────────────────────────────────────────────────

/**
 * Light metadata saved to IndexedDB / localStorage for recovery.
 * We do NOT store the raw blob persistently to avoid large storage.
 * We store enough to prompt the user to recapture.
 */
export interface EvidenceDraftMeta {
  jobId: string;
  capturedSlots: EvidenceSlot[];
  /** ISO timestamp of last save */
  savedAt: string;
}
