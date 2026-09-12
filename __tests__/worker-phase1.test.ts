/**
 * Worker Phase 1 — Component Logic Tests
 *
 * Tests for:
 * - LoginForm validation (client-side, using shared schemas)
 * - JobForm validation (using shared createJobSchema)
 * - ProfileForm validation (using shared updateProfileSchema)
 * - JobStatusControl — allowed transitions
 * - Status label mapping
 *
 * Tests run in Node (testEnvironment: node) per jest.config.ts.
 * We test the validation logic and schema integration, not React rendering.
 */

import {
  signUpSchema,
  signInSchema,
  createJobSchema,
  updateProfileSchema,
} from "@/lib/validation/schemas";
import type { JobStatus } from "@/lib/types";

// ── Auth validation (mirrors LoginForm.validate()) ─────────────────────────

describe("LoginForm — login validation", () => {
  it("accepts valid credentials", () => {
    const result = signInSchema.safeParse({
      email: "worker@example.com",
      password: "securepass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = signInSchema.safeParse({
      email: "",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = signInSchema.safeParse({
      email: "worker@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = signInSchema.safeParse({
      email: "not-an-email",
      password: "securepass",
    });
    expect(result.success).toBe(false);
  });
});

describe("LoginForm — signup validation", () => {
  it("accepts valid signup data", () => {
    const result = signUpSchema.safeParse({
      email: "worker@example.com",
      password: "securepass123",
      display_name: "Ramesh Kumar",
    });
    expect(result.success).toBe(true);
  });

  it("accepts signup without display_name", () => {
    const result = signUpSchema.safeParse({
      email: "worker@example.com",
      password: "securepass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password shorter than 8 chars", () => {
    const result = signUpSchema.safeParse({
      email: "worker@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toBeDefined();
    }
  });

  it("rejects display_name over 100 chars", () => {
    const result = signUpSchema.safeParse({
      email: "worker@example.com",
      password: "securepass123",
      display_name: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });
});

// ── Job form validation (mirrors JobForm.validate()) ──────────────────────

describe("JobForm — validation", () => {
  it("accepts a minimal valid job (title only)", () => {
    const result = createJobSchema.safeParse({
      title: "Fix kitchen sink",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a full valid job", () => {
    const result = createJobSchema.safeParse({
      title: "Bathroom tiling",
      description: "Complete re-tiling of 2 bathrooms",
      location: "Andheri West, Mumbai",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createJobSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toBeDefined();
    }
  });

  it("rejects title over 200 chars", () => {
    const result = createJobSchema.safeParse({
      title: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects description over 2000 chars", () => {
    const result = createJobSchema.safeParse({
      title: "Valid title",
      description: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects location over 200 chars", () => {
    const result = createJobSchema.safeParse({
      title: "Valid title",
      location: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("does not include worker_id in the schema (never client-provided)", () => {
    // createJobSchema should not have a worker_id field — it is enforced server-side
    const schemaShape = createJobSchema.shape;
    expect(schemaShape).not.toHaveProperty("worker_id");
  });
});

// ── Profile form validation (mirrors ProfileForm.validate()) ──────────────

describe("ProfileForm — validation", () => {
  it("accepts a full valid profile update", () => {
    const result = updateProfileSchema.safeParse({
      display_name: "Ramesh Kumar",
      bio: "10 years plumbing experience",
      city: "Mumbai",
      is_public: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial update (only city)", () => {
    const result = updateProfileSchema.safeParse({ city: "Delhi" });
    expect(result.success).toBe(true);
  });

  it("rejects bio over 500 chars", () => {
    const result = updateProfileSchema.safeParse({
      bio: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid avatar_url", () => {
    const result = updateProfileSchema.safeParse({
      avatar_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("allows null avatar_url (clears photo)", () => {
    const result = updateProfileSchema.safeParse({
      avatar_url: null,
    });
    expect(result.success).toBe(true);
  });

  it("does not include role in schema — role is a protected field", () => {
    // updateProfileSchema should have no 'role' field
    const schemaShape = updateProfileSchema.shape;
    expect(schemaShape).not.toHaveProperty("role");
  });

  it("does not include reputation_score in schema — protected field", () => {
    const schemaShape = updateProfileSchema.shape;
    expect(schemaShape).not.toHaveProperty("reputation_score");
  });
});

// ── JobStatusControl — allowed transition logic ───────────────────────────

// Mirrors getAllowedTransitions() from JobStatusControl.tsx
function getAllowedTransitions(status: JobStatus): string[] {
  switch (status) {
    case "pending":
      return ["in_progress", "cancelled"];
    case "in_progress":
      return ["completed", "cancelled"];
    case "completed":
    case "disputed":
    case "cancelled":
      return [];
    default:
      return [];
  }
}

describe("JobStatusControl — allowed transitions", () => {
  it("draft job allows start_work and cancel", () => {
    const allowed = getAllowedTransitions("pending");
    expect(allowed).toContain("in_progress");
    expect(allowed).toContain("cancelled");
  });

  it("in-progress job allows complete and cancel", () => {
    const allowed = getAllowedTransitions("in_progress");
    expect(allowed).toContain("completed");
    expect(allowed).toContain("cancelled");
  });

  it("completed job has no worker transitions", () => {
    expect(getAllowedTransitions("completed")).toHaveLength(0);
  });

  it("disputed job has no worker transitions", () => {
    expect(getAllowedTransitions("disputed")).toHaveLength(0);
  });

  it("cancelled job has no worker transitions", () => {
    expect(getAllowedTransitions("cancelled")).toHaveLength(0);
  });

  it("worker cannot transition to 'disputed' directly", () => {
    const fromPending = getAllowedTransitions("pending");
    const fromInProgress = getAllowedTransitions("in_progress");
    expect(fromPending).not.toContain("disputed");
    expect(fromInProgress).not.toContain("disputed");
  });
});

// ── Security: client never sends protected fields ─────────────────────────

describe("Security: protected fields never in client-sent schemas", () => {
  const PROFILE_PROTECTED = ["id", "role", "reputation_score", "created_at", "updated_at"];
  const JOB_PROTECTED = ["id", "worker_id", "customer_id", "created_at", "updated_at"];

  it("updateProfileSchema does not contain any protected profile fields", () => {
    const schemaShape = updateProfileSchema.shape;
    for (const field of PROFILE_PROTECTED) {
      expect(schemaShape).not.toHaveProperty(field);
    }
  });

  it("createJobSchema does not contain worker_id (always enforced server-side)", () => {
    // worker_id is intentionally absent from createJobSchema.
    // The server always sets it from the authenticated session.
    // customer_id IS present (optional) — workers may provide a customer reference.
    // The JOB_PROTECTED_FIELDS prevents PATCH from overriding worker_id/customer_id.
    const schemaShape = createJobSchema.shape;
    expect(schemaShape).not.toHaveProperty("worker_id");
    // customer_id is allowed in createJobSchema per the existing contract:
    expect(schemaShape).toHaveProperty("customer_id");
  });
});
