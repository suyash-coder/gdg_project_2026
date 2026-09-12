-- =====================================================================
-- WorkProof — Seed Data
--
-- Inserts reference data for development and testing.
-- NOTE: User accounts are created via the auth flow (signup API),
--       which triggers fn_handle_new_user() to create profile rows.
-- =====================================================================

-- ── Skills (reference data) ──────────────────────────────────────────

INSERT INTO skills (name, category) VALUES
  ('Plumbing',    'Home Services'),
  ('Electrical',  'Home Services'),
  ('Carpentry',   'Home Services'),
  ('Painting',    'Home Services'),
  ('Cleaning',    'Home Services'),
  ('Landscaping', 'Outdoor'),
  ('Masonry',     'Construction'),
  ('Tiling',      'Construction'),
  ('Roofing',     'Construction'),
  ('HVAC',        'Home Services')
ON CONFLICT (name) DO NOTHING;

-- ── Demo data instructions ───────────────────────────────────────────
--
-- To create demo users for local development:
--
-- 1. Start Supabase locally: `npx supabase start`
-- 2. Use the signup API endpoint to create users:
--    - POST /api/auth/signup with { email, password, display_name }
-- 3. To make a user admin, use the Supabase dashboard or run:
--    UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';
--
-- 4. Create demo jobs via the API:
--    - POST /api/jobs with auth token
--
-- This approach ensures all triggers fire correctly and
-- profile rows are created via fn_handle_new_user().
