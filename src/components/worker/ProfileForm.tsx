"use client";

/**
 * ProfileForm — Edit the authenticated worker's profile.
 *
 * Uses PATCH /api/profiles/me contract.
 * Validates using updateProfileSchema from the shared schemas.
 * Never sends protected fields (id, role, reputation_score, created_at, updated_at).
 *
 * Editable fields (from the existing contract):
 * - display_name
 * - bio
 * - city
 * - avatar_url (URL-only; image upload is Phase 2)
 * - is_public
 */

import { useState } from "react";
import type { Profile } from "@/lib/types";
import { updateProfileSchema } from "@/lib/validation/schemas";

interface ProfileFormProps {
  initialProfile: Profile | null;
}

interface FieldErrors {
  display_name?: string;
  bio?: string;
  city?: string;
  avatar_url?: string;
}

export default function ProfileForm({ initialProfile }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(
    initialProfile?.display_name ?? ""
  );
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [city, setCity] = useState(initialProfile?.city ?? "");
  const [avatarUrl, setAvatarUrl] = useState(
    initialProfile?.avatar_url ?? ""
  );
  const [isPublic, setIsPublic] = useState(
    initialProfile?.is_public ?? false
  );

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  function validate(): boolean {
    const result = updateProfileSchema.safeParse({
      display_name: displayName || undefined,
      bio: bio || undefined,
      city: city || undefined,
      avatar_url: avatarUrl || null,
      is_public: isPublic,
    });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setFieldErrors({
        display_name: flat.display_name?.[0],
        bio: flat.bio?.[0],
        city: flat.city?.[0],
        avatar_url: flat.avatar_url?.[0],
      });
      return false;
    }
    setFieldErrors({});
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSaved(false);
    if (!validate()) return;

    // Build only the fields that are defined by the updateProfileSchema
    // Never include id, role, reputation_score, created_at, updated_at
    const body: Record<string, unknown> = {
      is_public: isPublic,
    };
    if (displayName) body.display_name = displayName;
    if (bio) body.bio = bio;
    if (city) body.city = city;
    body.avatar_url = avatarUrl || null;

    setLoading(true);
    try {
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "Failed to update profile. Please try again.");
        return;
      }

      setSaved(true);
      // Reset saved message after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setServerError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={styles.form} id="profile-form">
      {/* Display name */}
      <div style={styles.field}>
        <label htmlFor="prof-display-name" style={styles.label}>
          Full Name
        </label>
        <input
          id="prof-display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Ramesh Kumar"
          style={{
            ...styles.input,
            ...(fieldErrors.display_name ? styles.inputError : {}),
          }}
          maxLength={100}
          disabled={loading}
          autoComplete="name"
        />
        {fieldErrors.display_name && (
          <span style={styles.errorMsg} role="alert">
            {fieldErrors.display_name}
          </span>
        )}
      </div>

      {/* City */}
      <div style={styles.field}>
        <label htmlFor="prof-city" style={styles.label}>
          City / Locality
        </label>
        <input
          id="prof-city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Andheri, Mumbai"
          style={{
            ...styles.input,
            ...(fieldErrors.city ? styles.inputError : {}),
          }}
          maxLength={100}
          disabled={loading}
        />
        {fieldErrors.city && (
          <span style={styles.errorMsg} role="alert">
            {fieldErrors.city}
          </span>
        )}
      </div>

      {/* Bio */}
      <div style={styles.field}>
        <label htmlFor="prof-bio" style={styles.label}>
          About / Skills
        </label>
        <textarea
          id="prof-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Describe your trade, experience and skills. e.g. 10 years experience in plumbing and bathroom fitting."
          rows={4}
          style={{
            ...styles.textarea,
            ...(fieldErrors.bio ? styles.inputError : {}),
          }}
          maxLength={500}
          disabled={loading}
        />
        {fieldErrors.bio && (
          <span style={styles.errorMsg} role="alert">
            {fieldErrors.bio}
          </span>
        )}
        <span style={styles.hint}>{bio.length}/500 characters</span>
      </div>

      {/* Avatar URL — direct URL only; upload is Phase 2 */}
      <div style={styles.field}>
        <label htmlFor="prof-avatar-url" style={styles.label}>
          Profile Photo URL
        </label>
        <input
          id="prof-avatar-url"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/photo.jpg"
          style={{
            ...styles.input,
            ...(fieldErrors.avatar_url ? styles.inputError : {}),
          }}
          maxLength={2048}
          disabled={loading}
          inputMode="url"
        />
        {fieldErrors.avatar_url && (
          <span style={styles.errorMsg} role="alert">
            {fieldErrors.avatar_url}
          </span>
        )}
        <span style={styles.hint}>
          Photo upload will be available soon. Enter a URL for now.
        </span>
      </div>

      {/* Public visibility */}
      <div style={styles.checkboxField}>
        <input
          id="prof-is-public"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          disabled={loading}
          style={styles.checkbox}
        />
        <div>
          <label htmlFor="prof-is-public" style={styles.checkboxLabel}>
            Make profile public
          </label>
          <p style={styles.checkboxHint}>
            Allow customers to find you in the public worker directory.
          </p>
        </div>
      </div>

      {serverError && (
        <div style={styles.serverError} role="alert" id="profile-form-error">
          {serverError}
        </div>
      )}

      {saved && (
        <div style={styles.successMsg} role="status" id="profile-saved-msg">
          ✓ Profile saved successfully
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
        id="profile-save-btn"
        aria-busy={loading}
      >
        {loading ? "Saving…" : "Save Profile"}
      </button>
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
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
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
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
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
  checkboxField: { display: "flex", gap: "12px", alignItems: "flex-start" },
  checkbox: { width: "18px", height: "18px", marginTop: "2px", flexShrink: 0, cursor: "pointer" },
  checkboxLabel: { fontSize: "14px", fontWeight: "500", cursor: "pointer" },
  checkboxHint: { fontSize: "12px", color: "var(--muted)", marginTop: "2px" },
  serverError: {
    padding: "12px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "var(--radius)",
    fontSize: "14px",
    color: "var(--danger)",
  },
  successMsg: {
    padding: "12px",
    background: "#f0fdf4",
    border: "1px solid #86efac",
    borderRadius: "var(--radius)",
    fontSize: "14px",
    color: "var(--success)",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    background: "var(--primary)",
    color: "var(--primary-fg)",
    border: "none",
    borderRadius: "var(--radius)",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    minHeight: "48px",
  },
};
