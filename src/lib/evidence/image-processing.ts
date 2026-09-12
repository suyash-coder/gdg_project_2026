/**
 * image-processing.ts
 *
 * Worker 2 — Client-side image processing pipeline.
 *
 * Pipeline:
 *   raw Blob / ImageBitmap
 *   → validate magic bytes (never trust MIME type alone)
 *   → draw on Canvas
 *   → resize to MAX_DIMENSION if needed
 *   → compress to JPEG ≤ 1 MB
 *   → return final Blob
 *
 * Runs entirely in the browser — no external dependencies.
 * Uses only Canvas API and Web Crypto API.
 *
 * Important: SHA-256 is calculated AFTER compression, on the exact
 * bytes that will be uploaded. Do not hash anything else.
 */

import {
  MAX_IMAGE_BYTES,
  MAX_DIMENSION,
  JPEG_QUALITY,
  JPEG_MAGIC,
  WEBP_RIFF,
  WEBP_MARKER,
  type AcceptedMimeType,
  type ProcessedEvidence,
} from "./evidence-types";

// ── Magic byte validation ──────────────────────────────────────────

/**
 * Read the first N bytes of a Blob to validate image magic bytes.
 * Never trust MIME type alone — a renamed PNG or malicious file
 * could pass MIME checks. We check the actual bytes.
 */
async function readMagicBytes(blob: Blob, count: number): Promise<Uint8Array> {
  const slice = blob.slice(0, count);
  const buf = await slice.arrayBuffer();
  return new Uint8Array(buf);
}

function isJpeg(magic: Uint8Array): boolean {
  return (
    magic[0] === JPEG_MAGIC[0] &&
    magic[1] === JPEG_MAGIC[1] &&
    magic[2] === JPEG_MAGIC[2]
  );
}

function isWebP(magic: Uint8Array): boolean {
  // RIFF at 0–3, WEBP at 8–11 (need at least 12 bytes)
  if (magic.length < 12) return false;
  const riff =
    magic[0] === WEBP_RIFF[0] &&
    magic[1] === WEBP_RIFF[1] &&
    magic[2] === WEBP_RIFF[2] &&
    magic[3] === WEBP_RIFF[3];
  const webp =
    magic[8] === WEBP_MARKER[0] &&
    magic[9] === WEBP_MARKER[1] &&
    magic[10] === WEBP_MARKER[2] &&
    magic[11] === WEBP_MARKER[3];
  return riff && webp;
}

export async function validateImageMagicBytes(
  blob: Blob
): Promise<AcceptedMimeType | null> {
  const magic = await readMagicBytes(blob, 12);
  if (isJpeg(magic)) return "image/jpeg";
  if (isWebP(magic)) return "image/webp";
  return null;
}

// ── Canvas resize + compress ───────────────────────────────────────

/**
 * Load a Blob as an ImageBitmap for canvas drawing.
 * Falls back to creating an Image element if createImageBitmap is unavailable.
 */
async function blobToImageBitmap(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== "undefined") {
    return createImageBitmap(blob);
  }
  // Fallback: HTMLImageElement
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      createImageBitmap(img as unknown as ImageBitmapSource).then(resolve).catch(reject);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/**
 * Calculate output dimensions preserving aspect ratio,
 * capping at MAX_DIMENSION on the longer side.
 */
function calculateOutputDimensions(
  srcWidth: number,
  srcHeight: number
): { width: number; height: number } {
  const maxSide = MAX_DIMENSION;
  if (srcWidth <= maxSide && srcHeight <= maxSide) {
    return { width: srcWidth, height: srcHeight };
  }
  const scale = Math.min(maxSide / srcWidth, maxSide / srcHeight);
  return {
    width: Math.round(srcWidth * scale),
    height: Math.round(srcHeight * scale),
  };
}

/**
 * Draw the image on a canvas and compress to JPEG.
 * Iteratively reduces quality until size ≤ MAX_IMAGE_BYTES.
 */
async function drawAndCompress(
  bitmap: ImageBitmap,
  width: number,
  height: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  ctx.drawImage(bitmap, 0, 0, width, height);

  // Try progressively lower quality until within size limit
  const qualities = [JPEG_QUALITY, 0.72, 0.60, 0.50, 0.40];
  for (const quality of qualities) {
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (blob.size <= MAX_IMAGE_BYTES) {
      return blob;
    }
  }

  // Last resort: reduce dimensions by half and re-try
  const halfW = Math.round(width / 2);
  const halfH = Math.round(height / 2);
  const smallCanvas = document.createElement("canvas");
  smallCanvas.width = halfW;
  smallCanvas.height = halfH;
  const smallCtx = smallCanvas.getContext("2d")!;
  smallCtx.drawImage(bitmap, 0, 0, halfW, halfH);
  const finalBlob = await canvasToBlob(smallCanvas, "image/jpeg", 0.50);
  if (finalBlob.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `Could not compress image below ${MAX_IMAGE_BYTES / 1024}KB`
    );
  }
  return finalBlob;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null"));
      },
      type,
      quality
    );
  });
}

// ── SHA-256 (Web Crypto API) ───────────────────────────────────────

/**
 * Calculate SHA-256 hex digest of a Blob.
 *
 * IMPORTANT: Must be called on the EXACT final bytes that will be uploaded.
 * Not on the original frame, pre-compression bytes, or metadata.
 */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(hashBuf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Perceptual hash (dHash — difference hash) ─────────────────────
//
// Simple, reliable, zero-dependency implementation.
// Produces a 64-bit hex string (8x8 pixel grid difference hash).
// Used for near-duplicate detection ONLY — not proof of anything.

const PHASH_SIZE = 9; // 9×8 → 8 column diffs per row → 64 bits total

/**
 * Calculate a 64-bit dHash for an image represented by a bitmap.
 * Scales image to 9×8 grayscale, computes horizontal pixel differences.
 * Returns a 16-character hex string (two 32-bit numbers, high then low).
 * Compatible with ES2017 target (no BigInt).
 */
export function calculateDHash(bitmap: ImageBitmap): string {
  // Draw tiny 9×8 version
  const canvas = document.createElement("canvas");
  canvas.width = PHASH_SIZE;
  canvas.height = PHASH_SIZE - 1; // 8 rows
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, PHASH_SIZE, PHASH_SIZE - 1);
  const { data } = ctx.getImageData(0, 0, PHASH_SIZE, PHASH_SIZE - 1);

  // Two 32-bit accumulators for the 64-bit hash
  let hi = 0; // bits 63–32
  let lo = 0; // bits 31–0

  for (let i = 0; i < 64; i++) {
    const row = Math.floor(i / 8);
    const col = i % 8;
    const idxL = (row * PHASH_SIZE + col) * 4;
    const idxR = (row * PHASH_SIZE + col + 1) * 4;
    const gL = data[idxL] * 0.299 + data[idxL + 1] * 0.587 + data[idxL + 2] * 0.114;
    const gR = data[idxR] * 0.299 + data[idxR + 1] * 0.587 + data[idxR + 2] * 0.114;
    if (gL > gR) {
      // bit position from MSB: 63 - i
      const bitPos = 63 - i;
      if (bitPos >= 32) {
        hi |= 1 << (bitPos - 32);
      } else {
        lo |= 1 << bitPos;
      }
    }
  }

  const hiHex = (hi >>> 0).toString(16).padStart(8, "0");
  const loHex = (lo >>> 0).toString(16).padStart(8, "0");
  return hiHex + loHex;
}

// ── Public pipeline entry point ────────────────────────────────────

/**
 * Process a raw image Blob through the full pipeline:
 * validate → resize → compress → hash.
 *
 * Returns a ProcessedEvidence with:
 * - final compressed blob
 * - SHA-256 of THAT exact blob (not the original)
 * - perceptual hash for near-duplicate detection
 * - dimensions and size
 *
 * Throws on invalid/unsupported input.
 */
export async function processEvidenceImage(
  raw: Blob
): Promise<ProcessedEvidence> {
  // 1. Magic byte validation — never trust MIME type alone
  const detectedMime = await validateImageMagicBytes(raw);
  if (!detectedMime) {
    throw new Error(
      "Invalid image: only JPEG and WebP files are accepted. " +
        "The file format was not recognised from its content."
    );
  }

  // 2. Decode to bitmap
  let bitmap: ImageBitmap;
  try {
    bitmap = await blobToImageBitmap(raw);
  } catch {
    throw new Error("Could not decode image. The file may be corrupted.");
  }

  // 3. Calculate perceptual hash BEFORE resize for consistency
  //    (we hash on the decoded pixels, not the file bytes)
  const perceptualHash = calculateDHash(bitmap);

  // 4. Calculate output dimensions
  const { width, height } = calculateOutputDimensions(
    bitmap.width,
    bitmap.height
  );

  // 5. Draw and compress to JPEG ≤ 1 MB
  const compressedBlob = await drawAndCompress(bitmap, width, height);

  // 6. Close bitmap to free GPU memory
  bitmap.close();

  // 7. SHA-256 of the FINAL compressed blob — the bytes that will be uploaded
  const sha256 = await sha256Hex(compressedBlob);

  return {
    blob: compressedBlob,
    mimeType: "image/jpeg",
    sha256,
    perceptualHash,
    width,
    height,
    sizeBytes: compressedBlob.size,
  };
}
