# WORKER2_MERGE_NOTES.md

Worker 2 is feature-complete and branch-ready.
This document provides integration information for the team merge with Worker 1 and Worker 3.

---

## Worker 2 Implemented

The following features are fully implemented and tested on this branch:

### Phase 1 – Worker Foundation
- Authentication UI: Login / Signup forms using existing `/api/auth/*` contract
- Auth guards: Worker layout server-side redirect (`/login`) for unauthenticated users
- Worker profile page: PATCH `/api/profiles/me` with `updateProfileSchema` validation
- Profile completion indicator on dashboard (no invented values)
- Worker dashboard: Authoritative stats from backend only (`reputation_score`, attested count, recent jobs)
- Jobs list page with status filter tabs
- Job creation form (POST `/api/jobs`)
- Job edit form (PATCH `/api/jobs/[id]`)
- Draft recovery with `localStorage` auto-save, `Resume / Discard` prompt, and `createJobSchema.partial()` validation before restore
- Worker navigation (mobile-first bottom nav)

### Phase 2 – Evidence Capture
- Camera-based capture using `MediaDevices.getUserMedia`
- BEFORE / AFTER slot distinction, enforced in order
- Max 2 images rule, enforced client-side
- Magic byte validation (JPEG: `FF D8 FF`, WebP: `RIFF…WEBP`) — MIME type alone is not trusted
- Iterative JPEG compression to ≤ 1 MB using Canvas API
- SHA-256 calculated on the **final compressed bytes** (not original), using Web Crypto API
- 64-bit dHash perceptual hash for near-duplicate detection (ES2017-compatible, no BigInt)
- Preview URL lifecycle management (object URL revocation to prevent memory leaks)
- Camera track cleanup after each capture
- Full evidence state machine: `idle → requesting_camera → capturing → reviewing → processing → ready → uploading → success | error`
- Upload adapter integration seam (`uploadJobEvidence`) — currently returns `upload_endpoint_unavailable` until Worker 1 delivers the endpoint

### Phase 3 – Verification Handoff
- Verification link generation UI consuming `verification-adapter.ts` integration boundary
- Honest failure state shown when Worker 1 endpoint is unavailable
- Web Share API with clipboard fallback
- Worker is clearly told that generating the link does NOT mean attestation is complete

### Phase 4 – Work History & Reputation
- Jobs list page: shows evidence and attestation status via joined Supabase queries (`job_media`, `customer_attestations`)
- Evidence status on job detail based on actual `job_media` rows, not hardcoded status assumptions
- Dashboard: `reputation_score` and attested count from authoritative backend data
- Dashboard: `Average Rating` and `Repeat Customers` explicitly labelled "Not provided by backend" — no invented values

### Phase 5 – Sharing / CV Integration Boundaries
- Share Profile component on dashboard: Web Share API, clipboard fallback, WhatsApp deep link
- Public Profile adapter (`src/lib/public-profile-adapter.ts`) — returns `null` until Worker 3 defines the canonical URL
- Profile QR integration boundary — blocked, clearly documented, no fake placeholder
- Digital CV integration boundary — blocked, clearly documented, correctly throws on call

---

## Worker 1 Dependencies

The following backend endpoints are still required and are **not implemented** in the current branch:

| Endpoint | Status | Integration Point |
|---|---|---|
| `POST /api/jobs/[id]/media` | ❌ Not available | `src/lib/evidence/upload-adapter.ts` — replace `_callMediaUploadEndpoint()` body |
| `POST /api/jobs/[id]/verification` | ❌ Not available | `src/lib/verification/verification-adapter.ts` — replace stub body |

Both adapters are clearly documented integration seams. When Worker 1 delivers the endpoints:
1. Open the respective adapter file
2. Replace only the stub body inside the named inner function
3. The public-facing function signatures are stable and must not change

---

## Worker 3 Dependencies

| Feature | Status | Integration Point |
|---|---|---|
| Canonical public profile URL (`/p/[id]` or similar) | ❌ Not defined in contract | `src/lib/public-profile-adapter.ts` — update the one-liner to return the correct URL |
| QR code for public profile | ❌ Blocked on URL + dependency approval | `src/components/worker/ProfileQR.tsx` — add `qrcode.react` and implement once URL is defined |
| Digital CV / PDF | ❌ Blocked on dependency approval | `src/lib/cv-generator.ts` — add `pdf-lib` and implement once URL is defined |
| Customer-facing verification/attestation page | Worker 3 owned | Worker 2 only generates the link; Worker 3 owns the destination page |

---

## Files That May Conflict During Merge

These shared files were modified by Worker 2 and may require merge coordination:

| File | Worker 2 Change | Risk |
|---|---|---|
| `src/app/globals.css` | Added CSS variables (`--muted-bg`, `--radius-sm`, `--nav-height`, etc.) | Low — additive changes only |
| `src/app/layout.tsx` | Added font/meta | Low |
| `src/app/page.tsx` | Changed root redirect to `/dashboard` | Low |

---

## Files Considered Worker-2-Owned

These files are entirely Worker 2's responsibility:

```
src/app/(worker)/
  layout.tsx
  dashboard/page.tsx
  profile/page.tsx
  jobs/page.tsx
  jobs/new/page.tsx
  jobs/[id]/page.tsx
  jobs/[id]/edit/page.tsx
  jobs/[id]/evidence/page.tsx

src/components/worker/
  CameraVideo.tsx
  EvidenceCaptureFlow.tsx
  EvidencePage.tsx
  JobForm.tsx
  JobStatusControl.tsx
  LoginForm.tsx
  ProfileForm.tsx
  ProfileQR.tsx
  ShareProfile.tsx
  VerificationHandoff.tsx
  WorkerNav.tsx

src/hooks/
  useCamera.ts

src/lib/evidence/
  evidence-types.ts
  image-processing.ts
  upload-adapter.ts

src/lib/verification/
  verification-adapter.ts

src/lib/
  cv-generator.ts
  public-profile-adapter.ts

__tests__/
  worker-phase1.test.ts
  worker-phase2.test.ts
  worker-phase3.test.ts
  worker-phase4.test.ts
  worker-phase5.test.ts
```

---

## Known Pre-Existing Issues

These issues existed before Worker 2's work and belong to Worker 1:

| Issue | File | Owner |
|---|---|---|
| `TS18046: 'mockSupabase' is of type 'unknown'` (7 errors in tsc) | `__tests__/auth-middleware.test.ts` | Worker 1 |
| `allows admin to change roles` test failure | `__tests__/security.test.ts` | Worker 1 |
| `prevents customer from attesting twice` (expects 409, gets 400) | `__tests__/security.test.ts` | Worker 1 |
| `prevents non-customer from attesting` (expects 403, gets 400) | `__tests__/security.test.ts` | Worker 1 |

**Worker 2 did not touch and must not touch these files.**

---

## Manual Verification Checklist

Run after merging all three branches:

### Auth
- [ ] Sign up as a new worker — redirected to dashboard
- [ ] Log in as existing worker — redirected to dashboard
- [ ] Visit `/dashboard` unauthenticated — redirected to `/login`

### Profile
- [ ] Update display name, bio, city — saved correctly
- [ ] Set profile public — verify `is_public = true` in DB
- [ ] Attempt to send `role` or `reputation_score` in PATCH body — rejected by server

### Jobs
- [ ] Create a new job — appears in job list with status `Draft`
- [ ] Create job with no title — validation error shown
- [ ] Open `/jobs/new`, type title, close tab, reopen — draft restored with Resume/Discard prompt
- [ ] Discard prompt — form clears
- [ ] Resume prompt — form restores, saves to DB, draft cleared from localStorage
- [ ] Start work (pending → in_progress), complete (in_progress → completed)
- [ ] Job list filters work for All / Draft / In Progress / Completed

### Evidence (requires Worker 1 `POST /api/jobs/[id]/media`)
- [ ] Open evidence capture on `in_progress` job
- [ ] Camera permission denial — honest error, retry button shown
- [ ] Capture BEFORE photo — processing indicator, advance to AFTER
- [ ] Attempt to use same photo for AFTER — duplicate warning shown, retake required
- [ ] Capture AFTER photo — evidence summary shown with SHA-256 integrity note
- [ ] Submit — upload adapter called (currently returns unavailable until Worker 1 delivers endpoint)

### Verification (requires Worker 1 `POST /api/jobs/[id]/verification`)
- [ ] On `completed` job without attestation — verification handoff shown
- [ ] Click "Generate Verification Link" — honest error (endpoint unavailable)
- [ ] Once endpoint available: link displayed, Web Share API tried, clipboard fallback works
- [ ] Worker is shown clear notice that attestation is still pending

### Dashboard
- [ ] Reputation score matches DB value exactly
- [ ] Attested jobs count matches `customer_attestations` where `status = approved`
- [ ] Average Rating and Repeat Customers shown as "Not provided by backend"

### Share Controls (requires Worker 3 canonical URL)
- [ ] Share Profile button disabled with clear message when URL undefined
- [ ] Once Worker 3 URL defined: Share opens native share sheet or copies URL
- [ ] WhatsApp share URL contains only the public profile URL — no private data
- [ ] Download Digital CV button: shows clear error that dependency is missing
