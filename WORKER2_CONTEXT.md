# WORKER 2 CONTEXT — WorkProof

## Role
Worker 2 owns the Worker + Evidence side.

## Product
WorkProof = portable digital work-history/reputation for informal skilled workers.
Flow: Worker profile → completed job → before/after evidence → customer attestation → reputation → public profile → sharing.

Not in MVP: Aadhaar, biometrics, payments/escrow, insurance, booking marketplace, criminal checks, automatic skill certification, paid APIs.

## Team Ownership
Worker 1: Supabase schema/migrations, auth foundation, RLS, server authorization, shared API contracts, storage policies, shared infrastructure, deployment.
Worker 2: worker onboarding, worker profile/dashboard, skills, job creation, camera evidence capture, crop/resize/compression, SHA-256, perceptual hash, evidence upload UI, worker job states, work history, verification QR/link UI, reputation summary.
Worker 3: public search/profile, customer auth/attestation/photo consent, ratings/reviews, sharing, PDF CV, admin, disputes/reports.

Never silently edit another owner's files.

## Terminology
Use: Account verified; Customer-attested job; Evidence-backed work; Customer-attested reputation; Self-declared skill.
Never use: Verified worker; Certified worker; Guaranteed worker; Tamper-proof photos; Skill verified unless actually proven.

## Job States
DRAFT → EVIDENCE_CAPTURED → AWAITING_ATTESTATION → CUSTOMER_ATTESTED → PUBLISHED
Alternative: AWAITING_ATTESTATION → DISPUTED → RESOLVED
Only CUSTOMER_ATTESTED jobs count toward public reputation.

## Evidence
Evidence is supporting evidence, not proof the worker performed the job.
Capture through browser camera; resize/compress; calculate SHA-256 for exact integrity; calculate perceptual hash for near-duplicate detection; upload through the shared backend/storage contract.
Do not describe SHA-256 or pHash as proof of authenticity.
MVP: max 2 images/job, target ≤1 MB compressed, JPEG/WebP.

## Privacy
Do not expose private evidence unless backend authorizes it.
Customer confirmation and photo-publication consent are separate and owned by Worker 3.

## Technical Stack
Next.js + TypeScript
Supabase
Supabase Storage
MediaDevices / browser camera
Canvas for image processing
Web Crypto API for SHA-256
Perceptual hashing
IndexedDB for unfinished drafts
qrcode for verification QR
No paid external APIs.

## Coding Rules
1. Read DEVELOPMENT_CONTRACT.md before every phase.
2. Inspect current code before editing.
3. Reuse shared types/routes/helpers/contracts.
4. Do not invent duplicate DB tables or APIs.
5. Do not change dependencies without Worker 1 approval.
6. Stay inside Worker 2 ownership.
7. Never trust client-provided worker IDs, roles or reputation values.
8. Run typecheck, lint and relevant tests after every phase.
9. Do not add unrelated features.
10. Report changed files, tests, assumptions and blockers.

## Worker UX
Create profile → select trade → select skills → add experience/details → add work → capture before → capture after → submit evidence → generate customer verification link/QR → wait for attestation.

Must handle camera denial, upload failure, network failure, unsupported images and invalid job states. Recover unfinished drafts locally when practical.

## Integration
Worker 2 owns worker-side UI and evidence client processing.
Worker 1 owns authoritative backend/security.
Worker 3 owns customer attestation.
When crossing boundaries, follow DEVELOPMENT_CONTRACT.md.

## Done
A worker can create/edit their profile, select skills, create a job, capture before/after evidence, see upload/error states, recover drafts where supported, see correct job state, generate verification link/QR, and see authoritative attested work/reputation data.
