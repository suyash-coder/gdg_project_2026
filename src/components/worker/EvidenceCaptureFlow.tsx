"use client";

/**
 * EvidenceCaptureFlow.tsx
 *
 * Worker 2 — Full evidence capture + processing + submission UI.
 *
 * State machine:
 *   idle → requesting_camera → capturing → reviewing →
 *   processing → ready → uploading → success | error
 *
 * BEFORE and AFTER are explicitly separated.
 * The worker must capture them in order.
 * Cannot submit until both slots are captured and processed.
 *
 * Upload calls uploadJobEvidence() — the integration seam.
 * If the backend endpoint is unavailable, an honest error is shown.
 * The UI never falsely claims success.
 */

import { useState, useCallback, useRef } from "react";
import { useCamera } from "@/hooks/useCamera";
import { processEvidenceImage } from "@/lib/evidence/image-processing";
import { uploadJobEvidence } from "@/lib/evidence/upload-adapter";
import CameraVideo from "./CameraVideo";
import type {
  EvidenceSlot,
  ProcessedEvidence,
  EvidenceUIState,
  EvidenceError,
  EvidenceErrorKind,
} from "@/lib/evidence/evidence-types";
import { MAX_EVIDENCE_IMAGES, EVIDENCE_SLOTS } from "@/lib/evidence/evidence-types";

interface EvidenceCaptureFlowProps {
  jobId: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface SlotState {
  raw: Blob | null; // captured frame (pre-processing)
  processed: ProcessedEvidence | null;
  previewUrl: string | null; // object URL for display only
}

const SLOT_LABELS: Record<EvidenceSlot, string> = {
  before: "BEFORE",
  after: "AFTER",
};

const SLOT_DESCRIPTIONS: Record<EvidenceSlot, string> = {
  before: "Take a photo BEFORE the work is done",
  after: "Take a photo AFTER the work is done",
};

export default function EvidenceCaptureFlow({
  jobId,
  onComplete,
  onCancel,
}: EvidenceCaptureFlowProps) {
  const camera = useCamera();

  // Current step in the flow
  const [currentSlot, setCurrentSlot] = useState<EvidenceSlot>("before");
  const [uiState, setUiState] = useState<EvidenceUIState>("idle");
  const [flowError, setFlowError] = useState<EvidenceError | null>(null);

  // Captured evidence for each slot
  const [slots, setSlots] = useState<Record<EvidenceSlot, SlotState>>({
    before: { raw: null, processed: null, previewUrl: null },
    after: { raw: null, processed: null, previewUrl: null },
  });

  // Upload results tracking (used for parent notification on complete)
  const uploadedSlotsRef = useRef<Partial<Record<EvidenceSlot, string>>>({});

  // Prevent accidental same-blob duplication
  const lastCapturedHashRef = useRef<string | null>(null);

  // ── Preview URL management ─────────────────────────────────────

  function setSlotPreview(slot: EvidenceSlot, blob: Blob | null) {
    setSlots((prev) => {
      // Revoke old URL to avoid memory leaks
      if (prev[slot].previewUrl) {
        URL.revokeObjectURL(prev[slot].previewUrl!);
      }
      const previewUrl = blob ? URL.createObjectURL(blob) : null;
      return {
        ...prev,
        [slot]: { ...prev[slot], raw: blob, previewUrl },
      };
    });
  }

  // ── Open camera ────────────────────────────────────────────────

  const openCamera = useCallback(async () => {
    setFlowError(null);
    setUiState("requesting_camera");
    await camera.startCamera();
    if (camera.state === "error" || camera.state === "unsupported") {
      setFlowError(camera.error);
      setUiState("error");
    } else {
      setUiState("capturing");
    }
  }, [camera]);

  // ── Capture frame ──────────────────────────────────────────────

  const captureFrame = useCallback(() => {
    const raw = camera.captureFrame();
    if (!raw) {
      setFlowError({
        kind: "camera_unavailable" as EvidenceErrorKind,
        message: "Could not capture frame. Please try again.",
        retryable: true,
      });
      setUiState("error");
      return;
    }
    setSlotPreview(currentSlot, raw);
    setUiState("reviewing");
  }, [camera, currentSlot]);

  // ── Retake ────────────────────────────────────────────────────

  const retake = useCallback(async () => {
    // Clear current slot raw
    setSlots((prev) => {
      if (prev[currentSlot].previewUrl) {
        URL.revokeObjectURL(prev[currentSlot].previewUrl!);
      }
      return {
        ...prev,
        [currentSlot]: { raw: null, processed: null, previewUrl: null },
      };
    });
    setFlowError(null);
    await openCamera();
  }, [currentSlot, openCamera]);

  // ── Confirm capture → process ──────────────────────────────────

  const confirmCapture = useCallback(async () => {
    const raw = slots[currentSlot].raw;
    if (!raw) return;

    setUiState("processing");
    setFlowError(null);

    try {
      const processed = await processEvidenceImage(raw);

      // Duplicate detection: warn if same perceptual hash as last slot
      if (
        lastCapturedHashRef.current !== null &&
        lastCapturedHashRef.current === processed.perceptualHash &&
        currentSlot === "after"
      ) {
        setFlowError({
          kind: "invalid_image" as EvidenceErrorKind,
          message:
            "AFTER photo appears identical to BEFORE photo. " +
            "Please capture the AFTER work state separately.",
          retryable: true,
        });
        // Revert to reviewing so user can retake
        setUiState("reviewing");
        return;
      }

      // Store processed result
      setSlots((prev) => ({
        ...prev,
        [currentSlot]: { ...prev[currentSlot], processed },
      }));

      lastCapturedHashRef.current = processed.perceptualHash;

      // Advance to next slot or ready state
      if (currentSlot === "before") {
        setCurrentSlot("after");
        setUiState("idle");
      } else {
        setUiState("ready");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Image processing failed.";
      setFlowError({
        kind: "processing_failed" as EvidenceErrorKind,
        message: msg,
        retryable: true,
      });
      setUiState("error");
    }
  }, [slots, currentSlot]);

  // ── Submit ────────────────────────────────────────────────────

  const submit = useCallback(async () => {
    const before = slots.before.processed;
    const after = slots.after.processed;

    if (!before || !after) {
      setFlowError({
        kind: "invalid_image" as EvidenceErrorKind,
        message: "Both BEFORE and AFTER photos are required.",
        retryable: false,
      });
      return;
    }

    // Enforce max 2 images
    const totalImages = Object.values(slots).filter((s) => s.processed).length;
    if (totalImages > MAX_EVIDENCE_IMAGES) {
      setFlowError({
        kind: "invalid_image" as EvidenceErrorKind,
        message: `Maximum ${MAX_EVIDENCE_IMAGES} evidence images allowed.`,
        retryable: false,
      });
      return;
    }

    setUiState("uploading");
    setFlowError(null);

    const results: Partial<Record<EvidenceSlot, string>> = {};
    let uploadError: EvidenceError | null = null;

    for (const slot of EVIDENCE_SLOTS) {
      const p = slots[slot].processed!;
      const result = await uploadJobEvidence({
        jobId,
        evidenceType: slot,
        file: p.blob,
        sha256: p.sha256,
        perceptualHash: p.perceptualHash,
        mimeType: p.mimeType,
      });

      if (!result.ok) {
        uploadError = result.error;
        break;
      }
      results[slot] = result.mediaId;
    }

    if (uploadError) {
      setFlowError(uploadError);
      setUiState("error");
      return;
    }

    uploadedSlotsRef.current = results;
    setUiState("success");

    // Clean up preview URLs
    Object.values(slots).forEach((s) => {
      if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
    });

    // Notify parent after a brief delay so user sees success message
    setTimeout(() => onComplete(), 1500);
  }, [slots, jobId, onComplete]);

  // ── Render ─────────────────────────────────────────────────────

  const doneSlots = EVIDENCE_SLOTS.filter((s) => slots[s].processed !== null);
  const totalProcessed = doneSlots.length;

  return (
    <div style={styles.container} id="evidence-capture-flow">
      {/* Progress header */}
      <div style={styles.header}>
        <button
          onClick={onCancel}
          style={styles.cancelBtn}
          id="evidence-cancel-btn"
          disabled={uiState === "uploading"}
        >
          ✕ Cancel
        </button>
        <div style={styles.progressRow}>
          {EVIDENCE_SLOTS.map((slot) => (
            <div
              key={slot}
              style={{
                ...styles.progressDot,
                background: slots[slot].processed
                  ? "var(--success)"
                  : slot === currentSlot && uiState !== "ready"
                    ? "var(--primary)"
                    : "var(--border)",
              }}
              title={SLOT_LABELS[slot]}
            />
          ))}
        </div>
        <span style={styles.stepCounter}>
          {totalProcessed}/{MAX_EVIDENCE_IMAGES}
        </span>
      </div>

      {/* Step label */}
      {uiState !== "success" && uiState !== "ready" && (
        <div style={styles.stepLabel}>
          <span style={styles.slotBadge}>{SLOT_LABELS[currentSlot]}</span>
          <p style={styles.slotDesc}>{SLOT_DESCRIPTIONS[currentSlot]}</p>
        </div>
      )}

      {/* ── IDLE: prompt to start camera ── */}
      {(uiState === "idle" || uiState === "requesting_camera") && (
        <div style={styles.idleContainer}>
          <div style={styles.cameraIcon}>📷</div>
          <p style={styles.idleText}>
            {uiState === "requesting_camera"
              ? "Requesting camera access…"
              : `Ready to capture ${SLOT_LABELS[currentSlot]} photo`}
          </p>
          <p style={styles.idleHint}>
            Allow camera permission when prompted.
            Your camera will stop automatically after each capture.
          </p>
          <button
            onClick={openCamera}
            disabled={uiState === "requesting_camera"}
            style={{
              ...styles.primaryBtn,
              opacity: uiState === "requesting_camera" ? 0.7 : 1,
            }}
            id={`open-camera-${currentSlot}`}
          >
            {uiState === "requesting_camera"
              ? "Opening camera…"
              : `Open Camera — ${SLOT_LABELS[currentSlot]}`}
          </button>
        </div>
      )}

      {/* ── CAPTURING: live camera view ── */}
      {uiState === "capturing" && (
        <div style={styles.cameraContainer}>
          <CameraVideo
            onReady={camera.onVideoReady}
            style={styles.video}
          />
          <div style={styles.cameraOverlay}>
            <button
              onClick={captureFrame}
              style={styles.captureBtn}
              id={`capture-${currentSlot}`}
              aria-label="Capture photo"
            >
              ⬤
            </button>
          </div>
        </div>
      )}

      {/* ── REVIEWING: show captured frame ── */}
      {uiState === "reviewing" && slots[currentSlot].previewUrl && (
        <div style={styles.reviewContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slots[currentSlot].previewUrl!}
            alt={`${SLOT_LABELS[currentSlot]} preview`}
            style={styles.previewImg}
            id={`preview-${currentSlot}`}
          />
          <div style={styles.reviewActions}>
            <button
              onClick={retake}
              style={styles.secondaryBtn}
              id={`retake-${currentSlot}`}
            >
              ↩ Retake
            </button>
            <button
              onClick={confirmCapture}
              style={styles.primaryBtn}
              id={`confirm-${currentSlot}`}
            >
              ✓ Use This Photo
            </button>
          </div>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {uiState === "processing" && (
        <div style={styles.statusContainer}>
          <div style={styles.spinner} aria-label="Processing image" />
          <p style={styles.statusText}>
            Processing image…
            <br />
            <span style={styles.statusHint}>
              Resizing, compressing, and calculating integrity hash.
            </span>
          </p>
        </div>
      )}

      {/* ── READY: both photos done, show summary before submit ── */}
      {uiState === "ready" && (
        <div style={styles.readyContainer}>
          <h2 style={styles.readyTitle}>Evidence Ready</h2>
          <div style={styles.previewGrid}>
            {EVIDENCE_SLOTS.map((slot) => {
              const s = slots[slot];
              return (
                <div key={slot} style={styles.previewGridItem}>
                  {s.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.previewUrl}
                      alt={`${SLOT_LABELS[slot]} photo`}
                      style={styles.thumbImg}
                    />
                  ) : (
                    <div style={styles.thumbPlaceholder} />
                  )}
                  <span style={styles.thumbLabel}>{SLOT_LABELS[slot]}</span>
                  {s.processed && (
                    <span style={styles.thumbMeta}>
                      {(s.processed.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hash info — transparency, not marketing */}
          <div style={styles.hashInfo}>
            <p style={styles.hashNote}>
              ✓ Images processed and hashed locally.
              These are supporting evidence only — not proof the work was done.
            </p>
          </div>

          <button
            onClick={submit}
            style={styles.primaryBtn}
            id="submit-evidence-btn"
          >
            Submit Evidence
          </button>
        </div>
      )}

      {/* ── UPLOADING ── */}
      {uiState === "uploading" && (
        <div style={styles.statusContainer}>
          <div style={styles.spinner} aria-label="Uploading" />
          <p style={styles.statusText}>Uploading evidence…</p>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {uiState === "success" && (
        <div style={styles.successContainer} id="evidence-success">
          <span style={styles.successIcon}>✓</span>
          <p style={styles.successText}>Evidence submitted successfully.</p>
          <p style={styles.successHint}>
            The job page will update with the new state.
          </p>
        </div>
      )}

      {/* ── ERROR ── */}
      {uiState === "error" && flowError && (
        <div style={styles.errorContainer} id="evidence-error">
          <p style={styles.errorTitle}>
            {errorTitle(flowError.kind)}
          </p>
          <p style={styles.errorMsg}>{flowError.message}</p>

          {flowError.kind === "camera_permission_denied" && (
            <div style={styles.permissionInstructions}>
              <p style={styles.instructionText}>
                To allow camera access:
              </p>
              <ol style={styles.instructionList}>
                <li>Tap the lock/camera icon in your browser address bar.</li>
                <li>Select &ldquo;Allow&rdquo; for Camera.</li>
                <li>Reload the page and try again.</li>
              </ol>
            </div>
          )}

          {flowError.retryable && (
            <button
              onClick={() => {
                setFlowError(null);
                setUiState("idle");
              }}
              style={styles.primaryBtn}
              id="evidence-retry-btn"
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Show per-slot error inline during reviewing */}
      {uiState === "reviewing" && flowError && (
        <div style={styles.inlineError} role="alert">
          {flowError.message}
        </div>
      )}
    </div>
  );
}

function errorTitle(kind: EvidenceErrorKind): string {
  const titles: Record<EvidenceErrorKind, string> = {
    camera_permission_denied: "Camera Permission Denied",
    camera_unavailable: "Camera Not Available",
    browser_unsupported: "Browser Not Supported",
    invalid_image: "Invalid Photo",
    image_too_large: "Image Too Large",
    processing_failed: "Processing Failed",
    network_failure: "Network Error",
    upload_failure: "Upload Failed",
    invalid_job_state: "Invalid Job State",
    upload_endpoint_unavailable: "Upload Unavailable",
  };
  return titles[kind] ?? "Error";
}



const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100dvh",
    background: "var(--background)",
    maxWidth: "560px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid var(--border)",
  },
  cancelBtn: {
    background: "none",
    border: "none",
    color: "var(--muted)",
    fontSize: "14px",
    cursor: "pointer",
    padding: "4px 8px",
  },
  progressRow: { display: "flex", gap: "8px", alignItems: "center" },
  progressDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    transition: "background 0.2s",
  },
  stepCounter: { fontSize: "13px", color: "var(--muted)", minWidth: "32px", textAlign: "right" },
  stepLabel: { padding: "16px", borderBottom: "1px solid var(--border)" },
  slotBadge: {
    display: "inline-block",
    background: "var(--primary)",
    color: "var(--primary-fg)",
    fontSize: "12px",
    fontWeight: "700",
    padding: "3px 10px",
    borderRadius: "99px",
    marginBottom: "8px",
    letterSpacing: "0.05em",
  },
  slotDesc: { fontSize: "14px", color: "var(--muted)" },
  idleContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 24px",
    gap: "16px",
  },
  cameraIcon: { fontSize: "64px", lineHeight: 1 },
  idleText: { fontSize: "16px", fontWeight: "600", textAlign: "center" },
  idleHint: { fontSize: "13px", color: "var(--muted)", textAlign: "center", maxWidth: "280px" },
  cameraContainer: {
    position: "relative",
    flex: 1,
    background: "#000",
    display: "flex",
    flexDirection: "column",
  },
  video: {
    width: "100%",
    flex: 1,
    objectFit: "cover",
    display: "block",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: "24px",
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
  },
  captureBtn: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    background: "#fff",
    border: "4px solid rgba(255,255,255,0.5)",
    fontSize: "36px",
    color: "#111",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
  },
  reviewContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  previewImg: {
    width: "100%",
    flex: 1,
    objectFit: "cover",
    display: "block",
    maxHeight: "60dvh",
  },
  reviewActions: {
    display: "flex",
    gap: "12px",
    padding: "16px",
  },
  statusContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
    padding: "32px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid var(--border)",
    borderTopColor: "var(--primary)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  statusText: { fontSize: "15px", textAlign: "center", lineHeight: "1.6" },
  statusHint: { fontSize: "13px", color: "var(--muted)" },
  readyContainer: {
    flex: 1,
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  readyTitle: { fontSize: "18px", fontWeight: "700" },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  previewGridItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  thumbImg: {
    width: "100%",
    aspectRatio: "4/3",
    objectFit: "cover",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    display: "block",
  },
  thumbPlaceholder: {
    width: "100%",
    aspectRatio: "4/3",
    background: "var(--muted-bg)",
    borderRadius: "var(--radius)",
    border: "1px dashed var(--border)",
  },
  thumbLabel: { fontSize: "12px", fontWeight: "700", color: "var(--muted)" },
  thumbMeta: { fontSize: "11px", color: "var(--muted)" },
  hashInfo: {
    background: "var(--muted-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "12px",
  },
  hashNote: { fontSize: "12px", color: "var(--muted)", lineHeight: "1.5" },
  successContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "32px",
  },
  successIcon: { fontSize: "64px", color: "var(--success)" },
  successText: { fontSize: "16px", fontWeight: "600", color: "var(--success)" },
  successHint: { fontSize: "13px", color: "var(--muted)" },
  errorContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "24px 16px",
  },
  errorTitle: { fontSize: "16px", fontWeight: "700", color: "var(--danger)" },
  errorMsg: { fontSize: "14px", color: "var(--foreground)", lineHeight: "1.5" },
  permissionInstructions: {
    background: "var(--muted-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "14px",
  },
  instructionText: { fontSize: "13px", fontWeight: "600", marginBottom: "8px" },
  instructionList: {
    fontSize: "13px",
    color: "var(--muted)",
    paddingLeft: "20px",
    lineHeight: "1.8",
  },
  inlineError: {
    margin: "0 16px 12px",
    padding: "10px 12px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "var(--radius)",
    fontSize: "13px",
    color: "var(--danger)",
  },
  primaryBtn: {
    width: "100%",
    padding: "14px",
    background: "var(--primary)",
    color: "var(--primary-fg)",
    border: "none",
    borderRadius: "var(--radius)",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    minHeight: "48px",
  },
  secondaryBtn: {
    flex: 1,
    padding: "14px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    fontSize: "15px",
    fontWeight: "500",
    background: "var(--background)",
    color: "var(--foreground)",
    cursor: "pointer",
    minHeight: "48px",
  },
};
