/**
 * Worker Phase 5 Tests — Reputation Sharing & Digital CV Integration Boundaries
 *
 * Ensures that the system correctly defaults to a safe boundary state when
 * the canonical public profile URL and required dependencies are absent.
 */

import { getCanonicalPublicProfileUrl } from "@/lib/public-profile-adapter";
import { generateDigitalCV } from "@/lib/cv-generator";

describe("Phase 5 Integration Boundaries", () => {
  it("safely returns null for canonical URL when undefined by Worker 3", () => {
    // We expect this to return null rather than fabricating an unsafe URL.
    const url = getCanonicalPublicProfileUrl("test-worker-123");
    expect(url).toBeNull();
  });

  it("blocks digital CV generation due to missing dependency", async () => {
    // Expect the promise to reject with a clear error indicating the missing dependency.
    await expect(generateDigitalCV("test-worker-123")).rejects.toThrow(
      "CV Generation Blocked: Missing approved dependency (e.g., pdf-lib)."
    );
  });
});
