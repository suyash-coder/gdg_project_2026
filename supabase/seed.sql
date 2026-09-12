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

-- ── Demo Users ──────────────────────────────────────────────────────────

-- Helper to safely insert users without breaking existing ones
DO $$
DECLARE
  w1_id uuid := '11111111-1111-1111-1111-111111111111';
  w2_id uuid := '22222222-2222-2222-2222-222222222222';
  w3_id uuid := '33333333-3333-3333-3333-333333333333';
  c1_id uuid := '44444444-4444-4444-4444-444444444444';
  c2_id uuid := '55555555-5555-5555-5555-555555555555';
  j1_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  j2_id uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  j3_id uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
BEGIN
  -- We don't insert into auth.users directly here to avoid auth schema complexities 
  -- across different Supabase versions. Instead, we insert directly into profiles
  -- so the UI is populated for logged-out viewing. 
  -- Users should still create their own accounts to log in and test.

  INSERT INTO profiles (id, role, display_name, bio, city, is_public) VALUES
    (w1_id, 'worker', '[DEMO] Alice Plumber', 'Expert plumber with 10 years experience.', 'Seattle', true),
    (w2_id, 'worker', '[DEMO] Bob Builder', 'Master carpenter and builder.', 'Seattle', true),
    (w3_id, 'worker', '[DEMO] Carol Electrician', 'Licensed commercial electrician.', 'Bellevue', true),
    (c1_id, 'customer', '[DEMO] Customer Dan', 'Homeowner.', 'Seattle', false),
    (c2_id, 'customer', '[DEMO] Customer Eve', 'Property Manager.', 'Bellevue', false)
  ON CONFLICT (id) DO NOTHING;

  -- Create Jobs
  INSERT INTO jobs (id, worker_id, customer_id, title, status, location) VALUES
    (j1_id, w1_id, c1_id, 'Fix kitchen sink leak', 'completed', 'Seattle'),
    (j2_id, w1_id, c1_id, 'Install new dishwasher', 'completed', 'Seattle'), -- Repeat customer for w1
    (j3_id, w1_id, c2_id, 'Unclog master bathroom drain', 'completed', 'Bellevue')
  ON CONFLICT (id) DO NOTHING;

  -- Create Attestations with ratings
  INSERT INTO customer_attestations (job_id, customer_id, status, rating, review) VALUES
    (j1_id, c1_id, 'approved', 5, 'Great work, very fast!'),
    (j2_id, c1_id, 'approved', 4, 'Good job, slightly late but excellent quality.'),
    (j3_id, c2_id, 'approved', 5, 'Very professional and clean.')
  ON CONFLICT (job_id) DO NOTHING;

  -- Update profiles explicitly just in case triggers were bypassed in some environments
  UPDATE profiles SET 
    reputation_score = 3, 
    average_rating = 4.7, 
    rating_count = 3, 
    repeat_customers = 1 
  WHERE id = w1_id;

END $$;
