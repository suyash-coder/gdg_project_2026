"use client";

/**
 * JobForm — Create or edit a worker job.
 *
 * Create: POST /api/jobs  → newly created job is in 'pending' (draft) status.
 * Edit:   PATCH /api/jobs/[id]
 *
 * Validates using createJobSchema / updateJobSchema from the shared contract.
 * Never sends worker_id from the client (enforced server-side).
 * Never sends protected fields (id, worker_id, customer_id, created_at, updated_at).
 *
 * Phase 1 only — no evidence fields.
 * Draft persistence across refresh uses localStorage as a best-effort fallback.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/types";
import { createJobSchema } from "@/lib/validation/schemas";

interface JobFormProps {
  existingJob?: Job;
}

const DRAFT_KEY = "workproof:draft_job";

interface DraftData {
  title: string;
  description: string;
  location: string;
}

function loadDraft(): DraftData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    
    // Phase 4: Validate draft against current schema
    // We use partial because drafts are often incomplete
    const result = createJobSchema.partial().safeParse(parsed);
    
    if (!result.success) {
      // Malformed or tampered draft — discard silently
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    
    return {
      title: result.data.title ?? "",
      description: result.data.description ?? "",
      location: result.data.location ?? "",
    };
  } catch {
    return null;
  }
}

function saveDraft(data: DraftData) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // localStorage not available — silently ignore
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore
  }
}

interface FieldErrors {
  title?: string;
  description?: string;
  location?: string;
}

export default function JobForm({ existingJob }: JobFormProps) {
  const router = useRouter();
  const isEdit = Boolean(existingJob);

  // Pre-populate from existing job, or empty for new jobs (drafts handled below)
  const [title, setTitle] = useState(() => existingJob?.title ?? "");
  const [description, setDescription] = useState(() => existingJob?.description ?? "");
  const [location, setLocation] = useState(() => existingJob?.location ?? "");
  
  // Phase 4: Robust Draft Recovery state
  const [pendingDraft, setPendingDraft] = useState<DraftData | null>(() => {
    if (isEdit) return null;
    const draft = loadDraft();
    if (draft && (draft.title || draft.description || draft.location)) {
      return draft;
    }
    return null;
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-save draft for new jobs, only after pending draft is resolved
  useEffect(() => {
    if (isEdit || pendingDraft !== null) return;
    saveDraft({ title, description, location });
  }, [title, description, location, isEdit, pendingDraft]);

  function validate(): boolean {
    const result = createJobSchema.safeParse({
      title,
      description: description || undefined,
      location: location || undefined,
    });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setFieldErrors({
        title: flat.title?.[0],
        description: flat.description?.[0],
        location: flat.location?.[0],
      });
      return false;
    }
    setFieldErrors({});
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        title,
        description: description || undefined,
        location: location || undefined,
      };

      const url = isEdit ? `/api/jobs/${existingJob!.id}` : "/api/jobs";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "Failed to save job. Please try again.");
        return;
      }

      // Clear draft on success for new jobs
      if (!isEdit) {
        clearDraft();
      }

      setSuccess(true);
      const savedJob = json.data as Job;
      router.push(`/jobs/${savedJob.id}`);
    } catch {
      setServerError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDraft(e: React.MouseEvent) {
    e.preventDefault();
    setServerError(null);

    // Minimal validation — just title required
    if (!title.trim()) {
      setFieldErrors({ title: "Title is required" });
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      const body = {
        title: title.trim(),
        description: description || undefined,
        location: location || undefined,
      };

      const url = isEdit ? `/api/jobs/${existingJob!.id}` : "/api/jobs";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "Failed to save draft.");
        return;
      }

      clearDraft();
      const savedJob = json.data as Job;
      router.push(`/jobs/${savedJob.id}`);
    } catch {
      setServerError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <p style={{ color: "var(--success)", fontWeight: "600" }}>
          ✓ Job saved!
        </p>
      </div>
    );
  }

  // Phase 4: Draft Recovery Prompt
  if (pendingDraft) {
    return (
      <div style={styles.draftPromptCard}>
        <h2 style={styles.draftPromptTitle}>Unfinished draft found</h2>
        <p style={styles.draftPromptDesc}>
          Would you like to resume your previous unfinished job?
        </p>
        <div style={styles.draftPreview}>
          {pendingDraft.title ? <strong>{pendingDraft.title}</strong> : <em>(No title)</em>}
          {pendingDraft.location && <span> · {pendingDraft.location}</span>}
        </div>
        <div style={styles.actions}>
          <button
            type="button"
            style={styles.secondaryBtn}
            onClick={() => {
              clearDraft();
              setPendingDraft(null);
            }}
          >
            Discard
          </button>
          <button
            type="button"
            style={styles.primaryBtn}
            onClick={() => {
              setTitle(pendingDraft.title);
              setDescription(pendingDraft.description);
              setLocation(pendingDraft.location);
              setPendingDraft(null);
            }}
          >
            Resume
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={styles.form} id="job-form">
      {/* Title */}
      <div style={styles.field}>
        <label htmlFor="job-title" style={styles.label}>
          Job Title <span style={{ color: "var(--danger)" }}>*</span>
        </label>
        <input
          id="job-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Kitchen sink repair"
          style={{
            ...styles.input,
            ...(fieldErrors.title ? styles.inputError : {}),
          }}
          maxLength={200}
          disabled={loading}
          required
        />
        {fieldErrors.title && (
          <span style={styles.errorMsg} role="alert">
            {fieldErrors.title}
          </span>
        )}
        <span style={styles.hint}>{title.length}/200 characters</span>
      </div>

      {/* Description */}
      <div style={styles.field}>
        <label htmlFor="job-description" style={styles.label}>
          Description
        </label>
        <textarea
          id="job-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What work was done? Any materials used? Notes for the customer."
          rows={4}
          style={{
            ...styles.textarea,
            ...(fieldErrors.description ? styles.inputError : {}),
          }}
          maxLength={2000}
          disabled={loading}
        />
        {fieldErrors.description && (
          <span style={styles.errorMsg} role="alert">
            {fieldErrors.description}
          </span>
        )}
        <span style={styles.hint}>{description.length}/2000 characters</span>
      </div>

      {/* Location */}
      <div style={styles.field}>
        <label htmlFor="job-location" style={styles.label}>
          Location / Area
        </label>
        <input
          id="job-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Andheri West, Mumbai"
          style={{
            ...styles.input,
            ...(fieldErrors.location ? styles.inputError : {}),
          }}
          maxLength={200}
          disabled={loading}
        />
        {fieldErrors.location && (
          <span style={styles.errorMsg} role="alert">
            {fieldErrors.location}
          </span>
        )}
      </div>

      {serverError && (
        <div style={styles.serverError} role="alert" id="job-form-error">
          {serverError}
        </div>
      )}

      {/* Action buttons */}
      <div style={styles.actions}>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={loading}
          style={{ ...styles.secondaryBtn, opacity: loading ? 0.7 : 1 }}
          id="save-draft-btn"
        >
          {loading ? "Saving…" : "Save Draft"}
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}
          id="save-job-btn"
          aria-busy={loading}
        >
          {loading ? "Saving…" : isEdit ? "Update Job" : "Save Job"}
        </button>
      </div>

      {!isEdit && (
        <p style={styles.draftNote}>
          Your progress is auto-saved as a draft locally.
        </p>
      )}
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "14px", fontWeight: "500" },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "16px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--background)",
    color: "var(--foreground)",
    outline: "none",
    appearance: "none",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "16px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--background)",
    color: "var(--foreground)",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: "1.5",
  },
  inputError: { borderColor: "var(--danger)" },
  errorMsg: { fontSize: "12px", color: "var(--danger)" },
  hint: { fontSize: "12px", color: "var(--muted)" },
  serverError: {
    padding: "12px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "var(--radius)",
    fontSize: "14px",
    color: "var(--danger)",
  },
  actions: { display: "flex", gap: "12px" },
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
  primaryBtn: {
    flex: 2,
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
  draftNote: { fontSize: "12px", color: "var(--muted)", textAlign: "center" },
  draftPromptCard: {
    background: "var(--muted-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  draftPromptTitle: { fontSize: "16px", fontWeight: "700" },
  draftPromptDesc: { fontSize: "14px", color: "var(--muted)" },
  draftPreview: {
    padding: "12px",
    background: "var(--background)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
  },
};
