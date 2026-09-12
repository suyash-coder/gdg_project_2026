/**
 * Validation schema tests.
 *
 * Verifies Zod schemas accept valid input and reject invalid input.
 */

import {
  signUpSchema,
  signInSchema,
  updateProfileSchema,
  createJobSchema,
  createAttestationSchema,
  createDisputeSchema,
  createFraudFlagSchema,
  changeRoleSchema,
  paginationSchema,
  PROFILE_PROTECTED_FIELDS,
  JOB_PROTECTED_FIELDS,
} from "@/lib/validation/schemas";

describe("signUpSchema", () => {
  it("accepts valid signup data", () => {
    const result = signUpSchema.safeParse({
      email: "worker@example.com",
      password: "securepass123",
      display_name: "Test Worker",
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

  it("rejects invalid email", () => {
    const result = signUpSchema.safeParse({
      email: "not-an-email",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = signUpSchema.safeParse({
      email: "worker@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = signUpSchema.safeParse({
      email: "",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepts valid login data", () => {
    const result = signInSchema.safeParse({
      email: "worker@example.com",
      password: "securepass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing password", () => {
    const result = signInSchema.safeParse({
      email: "worker@example.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("accepts valid profile updates", () => {
    const result = updateProfileSchema.safeParse({
      display_name: "New Name",
      bio: "A worker bio",
      city: "Mumbai",
      is_public: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial updates", () => {
    const result = updateProfileSchema.safeParse({ city: "Delhi" });
    expect(result.success).toBe(true);
  });

  it("rejects bio exceeding max length", () => {
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
});

describe("createJobSchema", () => {
  it("accepts valid job data", () => {
    const result = createJobSchema.safeParse({
      title: "Fix kitchen sink",
      description: "Leaking pipe under the sink",
      location: "Mumbai",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createJobSchema.safeParse({
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title exceeding max length", () => {
    const result = createJobSchema.safeParse({
      title: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

describe("createAttestationSchema", () => {
  it("accepts valid attestation", () => {
    const result = createAttestationSchema.safeParse({
      job_id: "550e8400-e29b-41d4-a716-446655440000",
      status: "approved",
      comment: "Great work!",
      token: "valid_random_token",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = createAttestationSchema.safeParse({
      job_id: "550e8400-e29b-41d4-a716-446655440000",
      status: "invalid_status",
      token: "valid_random_token",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID job_id", () => {
    const result = createAttestationSchema.safeParse({
      job_id: "not-a-uuid",
      status: "approved",
      token: "valid_random_token",
    });
    expect(result.success).toBe(false);
  });
});

describe("createDisputeSchema", () => {
  it("accepts valid dispute", () => {
    const result = createDisputeSchema.safeParse({
      job_id: "550e8400-e29b-41d4-a716-446655440000",
      reason: "Work was not completed as described in the agreement",
    });
    expect(result.success).toBe(true);
  });

  it("rejects reason that is too short", () => {
    const result = createDisputeSchema.safeParse({
      job_id: "550e8400-e29b-41d4-a716-446655440000",
      reason: "Too short",
    });
    expect(result.success).toBe(false);
  });
});

describe("createFraudFlagSchema", () => {
  it("accepts valid fraud flag", () => {
    const result = createFraudFlagSchema.safeParse({
      target_user_id: "550e8400-e29b-41d4-a716-446655440000",
      reason: "Suspicious activity detected on multiple accounts",
      severity: "high",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid severity", () => {
    const result = createFraudFlagSchema.safeParse({
      target_user_id: "550e8400-e29b-41d4-a716-446655440000",
      reason: "Some long enough reason for validation",
      severity: "extreme",
    });
    expect(result.success).toBe(false);
  });
});

describe("changeRoleSchema", () => {
  it("accepts valid role change", () => {
    const result = changeRoleSchema.safeParse({
      user_id: "550e8400-e29b-41d4-a716-446655440000",
      role: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid role", () => {
    const result = changeRoleSchema.safeParse({
      user_id: "550e8400-e29b-41d4-a716-446655440000",
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("provides defaults when no input", () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("coerces string numbers", () => {
    const result = paginationSchema.safeParse({ page: "3", limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it("rejects limit > 100", () => {
    const result = paginationSchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });

  it("rejects page < 1", () => {
    const result = paginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });
});

describe("Protected field constants", () => {
  it("PROFILE_PROTECTED_FIELDS includes role and reputation", () => {
    expect(PROFILE_PROTECTED_FIELDS).toContain("role");
    expect(PROFILE_PROTECTED_FIELDS).toContain("reputation_score");
    expect(PROFILE_PROTECTED_FIELDS).toContain("id");
  });

  it("JOB_PROTECTED_FIELDS includes worker_id and customer_id", () => {
    expect(JOB_PROTECTED_FIELDS).toContain("worker_id");
    expect(JOB_PROTECTED_FIELDS).toContain("customer_id");
    expect(JOB_PROTECTED_FIELDS).toContain("id");
  });
});
