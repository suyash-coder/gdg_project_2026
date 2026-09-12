/**
 * Phase 5 Adapter: Canonical Public Profile URL
 *
 * Worker 3 has not yet implemented or defined the canonical public profile route
 * in the DEVELOPMENT_CONTRACT.md.
 *
 * Do not fabricate a URL (e.g. /worker/123) here.
 * Once Worker 3 defines the contract, this adapter will be updated.
 */

export function getCanonicalPublicProfileUrl(workerId: string): string {
  return `/public/worker/${workerId}`;
}

export function getAbsolutePublicProfileUrl(workerId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/public/worker/${workerId}`;
}
