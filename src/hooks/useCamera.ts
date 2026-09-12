"use client";

/**
 * useCamera.ts
 *
 * Worker 2 — React hook for camera access via MediaDevices API.
 *
 * Responsibilities:
 *  - Request camera access only when explicitly called (not on mount).
 *  - Prefer rear/environment camera on mobile.
 *  - Stop all tracks when stopCamera() is called or component unmounts.
 *  - Handle: permission denied, no camera, unsupported browser.
 *  - Never hold tracks open after capture is confirmed.
 */

import { useRef, useState, useCallback, useEffect } from "react";
import type { EvidenceError } from "@/lib/evidence/evidence-types";

export type CameraState =
  | "idle"
  | "requesting"
  | "active"
  | "error"
  | "unsupported";

interface UseCameraReturn {
  state: CameraState;
  error: EvidenceError | null;
  /** Called with the <video> element after it mounts; pass to CameraVideo's onReady prop */
  onVideoReady: (el: HTMLVideoElement | null) => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => Blob | null;
}

function isCameraSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

export function useCamera(): UseCameraReturn {
  // Internal ref — not exposed to callers; use videoRefCallback instead
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("idle");
  const [error, setError] = useState<EvidenceError | null>(null);

  // Handler called by CameraVideo after the element mounts
  const onVideoReady = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  // Stop all tracks and release camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState("idle");
  }, []);

  // Clean up on unmount — critical for privacy
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);

    if (!isCameraSupported()) {
      const err: EvidenceError = {
        kind: "browser_unsupported",
        message:
          "Your browser does not support camera access. " +
          "Please use a modern browser like Chrome, Firefox, or Safari.",
        retryable: false,
      };
      setError(err);
      setState("unsupported");
      return;
    }

    setState("requesting");

    const constraints: MediaStreamConstraints = {
      video: {
        // Prefer rear camera on mobile
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for metadata to be loaded before marking active
        await new Promise<void>((resolve) => {
          const video = videoRef.current!;
          if (video.readyState >= 2) {
            resolve();
            return;
          }
          video.onloadedmetadata = () => resolve();
        });
        await videoRef.current.play().catch(() => {
          // Autoplay may be blocked — continue anyway; user will see the frame
        });
      }

      setState("active");
    } catch (err) {
      const domErr = err as DOMException;

      if (
        domErr.name === "NotAllowedError" ||
        domErr.name === "PermissionDeniedError"
      ) {
        const evidErr: EvidenceError = {
          kind: "camera_permission_denied",
          message:
            "Camera permission was denied. " +
            "Please allow camera access in your browser settings and try again.",
          retryable: true,
        };
        setError(evidErr);
        setState("error");
      } else if (
        domErr.name === "NotFoundError" ||
        domErr.name === "DevicesNotFoundError"
      ) {
        const evidErr: EvidenceError = {
          kind: "camera_unavailable",
          message: "No camera found on this device.",
          retryable: false,
        };
        setError(evidErr);
        setState("error");
      } else {
        const evidErr: EvidenceError = {
          kind: "camera_unavailable",
          message: `Camera error: ${domErr.message || "Unknown error"}. Please try again.`,
          retryable: true,
        };
        setError(evidErr);
        setState("error");
      }
    }
  }, []);

  /**
   * Capture the current video frame as a JPEG Blob.
   * Stops the camera stream immediately after capture
   * to avoid keeping it running unnecessarily.
   *
   * Returns null if camera is not active.
   */
  const captureFrame = useCallback((): Blob | null => {
    const video = videoRef.current;
    if (!video || state !== "active") return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stop camera immediately after capture — privacy principle
    stopCamera();

    // Return as Blob synchronously using canvas.toDataURL (sync)
    // then convert to Blob for downstream processing
    const dataUrl = canvas.toDataURL("image/jpeg", 1.0);
    const byteString = atob(dataUrl.split(",")[1]);
    const arr = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      arr[i] = byteString.charCodeAt(i);
    }
    return new Blob([arr], { type: "image/jpeg" });
  }, [state, stopCamera]);

  return {
    state,
    error,
    onVideoReady,
    startCamera,
    stopCamera,
    captureFrame,
  };
}
