# WorkProof Development Contract

This document defines the shared foundation, data structures, API endpoints, and security constraints for the WorkProof platform.

**Owners:**
- **Person 1 (Backend/Security)**: Manages this contract, database schema, RLS policies, and core API endpoints.
- **Person 2 (Worker UI)**: Consumes these APIs to build the mobile-first worker application.
- **Person 3 (Customer/Admin UI)**: Consumes these APIs to build the desktop-first customer and moderation interfaces.

## 1. Authentication

We use Supabase Auth with cookie-based sessions via `@supabase/ssr`.
- **Client Components**: Use `createClient()` from `@/lib/supabase/client` to read data. The client only uses the `anon` key.
- **Server Components/API**: Sessions are automatically handled by `proxy.ts`.

### Endpoints
- `POST /api/auth/signup` - Body: `{ email, password, display_name? }`
- `POST /api/auth/login` - Body: `{ email, password }`
- `POST /api/auth/logout`

*Note: The `role` is automatically set to `'worker'` on signup via a database trigger (`fn_handle_new_user`). There is no client-accessible route to become a customer. To handle customer role assignment, use the Admin API (see section 3).*

## 2. API Conventions

- All requests/responses use JSON.
- Success response format: `{ "data": { ... } }`
- Error response format: `{ "error": "Message", "details": { ... } }`
- Types are defined in `@/lib/types.ts`. **Do not duplicate type definitions**; import them from there.

## 3. Core Models & Restrictions

### Profiles
Users cannot change their `role` or `reputation_score`. These are protected fields.
- `GET /api/profiles/me` - Get current user's profile.
- `PATCH /api/profiles/me` - Update profile (bio, city, avatar_url, etc).
- `GET /api/profiles/public` - Paginated list of public profiles.

### Jobs
Workers create jobs. Customers are associated later.
- `GET /api/jobs` - List jobs you participate in (paginated).
- `POST /api/jobs` - Create a job. `worker_id` is enforced server-side.
- `GET /api/jobs/[id]` - Get a single job.
- `PATCH /api/jobs/[id]` - Update job status/details. `customer_id` and `worker_id` are protected.

### Attestations (Customer Only)
Customers approve or reject completed jobs.
- `POST /api/attestations` - Submit an attestation. Body: `{ job_id, status, comment, token }`. Enforces:
  1. Requester is the customer of the job.
  2. The job does not already have an attestation.
  3. The `token` provided matches an unconsumed verification token for this job. On success, the token's `consumed_at` is set, rejecting further use.
- `GET /api/attestations` - List attestations related to your jobs.

*Reputation Score:* Calculated automatically by a database trigger counting `approved` attestations.

### Verification Tokens & Photo Consent
- `POST /api/jobs/[id]/verification-token` - (Worker Only). Generates a random 32-byte token for a job, stores its SHA-256 hash, and returns the raw token to the worker.
- `GET /api/verify/[token]` - (Public/Customer). Hashes the token and looks it up. Returns job and worker details if valid and not yet consumed. *Does not consume the token or require a session.*
- `POST /api/jobs/[id]/photo-consent` - (Customer Only). Body: `{ consent: boolean }`. Grants or revokes permission to display evidence publicly.
  - *Note:* Photo publication consent is strictly independent of attestation. A job can reach `CUSTOMER_ATTESTED` (and public display of metadata) with photo consent = `false`, keeping evidence strictly private.

### Storage & Private Evidence
All photos, videos, and documents are stored in the private `evidence` bucket.
- Direct public URLs do not exist.
- `POST /api/storage/signed-url` - Body: `{ media_id }`. Returns a time-limited URL if the requester is a participant of the job.

### Admin Actions
- `POST /api/admin/change-role` - Requires an admin user session (`requireRole('admin')`). Body: `{ user_id, role }`. Updates the target user's role server-side. Non-admins cannot self-escalate via this route. This is necessary because signups default to `worker`.

## 4. Security Rules & Assumptions

1. **No Client Trust:** Never trust client input for authorization decisions.
2. **RLS is Active:** Row Level Security is enabled on all tables. If a query returns empty unexpectedly, check the RLS policies in `supabase/migrations/00001_initial_schema.sql`.
3. **Admin Privileges:** Only the `admin` client (using the service-role key) can bypass RLS. This is strictly limited to server-side API routes and must use `requireRole('admin')` for authorization.
4. **No External APIs:** We do not integrate with Aadhaar, external payment providers, or paid APIs.

## 5. Development Setup

1. Start local Supabase: `npx supabase start`
2. Apply migrations (if not auto-applied): `npx supabase db push`
3. Start Next.js dev server: `npm run dev`
4. Use the API routes to create users, or use the Supabase local dashboard (http://localhost:54323) to manipulate data directly for testing.
