/**
 * Worker Phase 4 — Robust Draft Recovery and Data Authoritativeness
 *
 * Tests cover:
 * - LocalStorage draft validation (rejecting malformed data)
 * - Safe parsing using the current schema
 */

import { createJobSchema } from "@/lib/validation/schemas";

describe("Draft Recovery (Phase 4)", () => {
  it("validates a partial draft successfully", () => {
    // Simulate what loadDraft() does
    const raw = JSON.stringify({
      title: "Fix kitchen sink",
      location: "Mumbai",
      // description is intentionally missing, which is valid for a partial draft
    });

    const parsed = JSON.parse(raw);
    const result = createJobSchema.partial().safeParse(parsed);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Fix kitchen sink");
      expect(result.data.location).toBe("Mumbai");
      expect(result.data.description).toBeUndefined();
    }
  });

  it("rejects malformed types safely", () => {
    // Malformed: title is an object instead of string
    const raw = JSON.stringify({
      title: { bad: "data" }, 
    });

    const parsed = JSON.parse(raw);
    const result = createJobSchema.partial().safeParse(parsed);

    expect(result.success).toBe(false);
  });
  
  it("ignores completely invalid JSON payloads", () => {
    const raw = "not-json-at-all";
    let parsed = null;
    let errorThrown = false;
    
    try {
      parsed = JSON.parse(raw);
    } catch {
      errorThrown = true;
    }
    
    expect(errorThrown).toBe(true);
    expect(parsed).toBeNull();
  });
});
