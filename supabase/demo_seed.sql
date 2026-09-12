-- =====================================================================
-- WorkProof — Demo Data Seed
--
-- Inserts SYNTHETIC demo data for hackathon presentation.
-- ALL data is fictitious.
-- DO NOT RUN IN A REAL PRODUCTION ENVIRONMENT WITH REAL USERS.
-- =====================================================================

DO $$
DECLARE
  v_eddie_id uuid := '11111111-1111-1111-1111-111111111111';
  v_paul_id  uuid := '22222222-2222-2222-2222-222222222222';
  v_carl_id  uuid := '33333333-3333-3333-3333-333333333333';
  v_alice_id uuid := '44444444-4444-4444-4444-444444444444';
  v_bob_id   uuid := '55555555-5555-5555-5555-555555555555';

  v_job1_id  uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_job2_id  uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_job3_id  uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_job4_id  uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_job5_id  uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  v_job6_id  uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  
  v_skill_electrical uuid;
  v_skill_plumbing uuid;
  v_skill_carpentry uuid;
BEGIN

  -- ==========================================
  -- 1. Create auth.users
  -- Uses ON CONFLICT DO NOTHING to remain rerunnable.
  -- ==========================================
  
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
  (v_eddie_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo-eddie@workproof.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Eddie Electric"}', now(), now()),
  (v_paul_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo-paul@workproof.test',  crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Paul Plumber"}', now(), now()),
  (v_carl_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo-carl@workproof.test',  crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Carl Carpenter"}', now(), now()),
  (v_alice_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo-alice@workproof.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Alice Acme"}', now(), now()),
  (v_bob_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo-bob@workproof.test',   crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Bob Builder"}', now(), now())
  ON CONFLICT (id) DO NOTHING;
  
  -- The trg_on_auth_user_created trigger will have fired, creating row in `profiles`.
  
  -- ==========================================
  -- 2. Update Profiles
  -- ==========================================
  
  UPDATE profiles SET role = 'worker', city = 'Metropolis', bio = 'Expert electrician with 10 years of experience. Licensed and insured.', is_public = true WHERE id = v_eddie_id;
  UPDATE profiles SET role = 'worker', city = 'Gotham', bio = 'Professional plumber. No job is too small.', is_public = true WHERE id = v_paul_id;
  UPDATE profiles SET role = 'worker', city = 'Star City', bio = 'Master carpenter specializing in custom cabinetry and framing.', is_public = true WHERE id = v_carl_id;
  
  UPDATE profiles SET role = 'customer', city = 'Metropolis' WHERE id = v_alice_id;
  UPDATE profiles SET role = 'customer', city = 'Gotham' WHERE id = v_bob_id;

  -- ==========================================
  -- 3. Worker Skills
  -- ==========================================
  
  SELECT id INTO v_skill_electrical FROM skills WHERE name = 'Electrical' LIMIT 1;
  SELECT id INTO v_skill_plumbing FROM skills WHERE name = 'Plumbing' LIMIT 1;
  SELECT id INTO v_skill_carpentry FROM skills WHERE name = 'Carpentry' LIMIT 1;
  
  IF v_skill_electrical IS NOT NULL THEN
    INSERT INTO worker_skills (worker_id, skill_id) VALUES (v_eddie_id, v_skill_electrical) ON CONFLICT DO NOTHING;
  END IF;
  
  IF v_skill_plumbing IS NOT NULL THEN
    INSERT INTO worker_skills (worker_id, skill_id) VALUES (v_paul_id, v_skill_plumbing) ON CONFLICT DO NOTHING;
  END IF;
  
  IF v_skill_carpentry IS NOT NULL THEN
    INSERT INTO worker_skills (worker_id, skill_id) VALUES (v_carl_id, v_skill_carpentry) ON CONFLICT DO NOTHING;
  END IF;

  -- ==========================================
  -- 4. Jobs
  -- ==========================================
  
  INSERT INTO jobs (id, worker_id, customer_id, title, description, status, location, started_at, completed_at) VALUES
  (v_job1_id, v_eddie_id, v_alice_id, 'Complete Home Rewiring', 'Rewired the entire house, upgraded the main panel to 200A.', 'completed', 'Metropolis Heights', now() - interval '30 days', now() - interval '25 days'),
  (v_job2_id, v_eddie_id, v_bob_id, 'Install EV Charger', 'Installed a Level 2 EV charger in the garage.', 'completed', 'Metropolis Suburbs', now() - interval '15 days', now() - interval '14 days'),
  (v_job3_id, v_paul_id, v_alice_id, 'Fix Leaking Pipe', 'Fixed a major leak in the master bathroom shower.', 'completed', 'Metropolis Heights', now() - interval '10 days', now() - interval '9 days'),
  (v_job4_id, v_paul_id, v_bob_id, 'Install New Water Heater', 'Replaced old tank water heater with a new tankless system.', 'completed', 'Gotham City Center', now() - interval '5 days', now() - interval '4 days'),
  (v_job5_id, v_carl_id, v_alice_id, 'Custom Kitchen Cabinets', 'Built and installed custom oak kitchen cabinets.', 'completed', 'Metropolis Heights', now() - interval '45 days', now() - interval '20 days'),
  (v_job6_id, v_carl_id, v_bob_id, 'Repair Deck', 'Replaced rotten joists and installed new Trex decking.', 'in_progress', 'Gotham City Center', now() - interval '2 days', null)
  ON CONFLICT (id) DO UPDATE SET 
    worker_id = EXCLUDED.worker_id,
    customer_id = EXCLUDED.customer_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

  -- ==========================================
  -- 5. Customer Attestations
  -- ==========================================
  
  INSERT INTO customer_attestations (job_id, customer_id, status, comment) VALUES
  (v_job1_id, v_alice_id, 'approved', 'Eddie did a fantastic job, completely transformed our home safely.'),
  (v_job2_id, v_bob_id, 'approved', 'Very quick and professional. EV charger works perfectly.'),
  (v_job3_id, v_alice_id, 'approved', 'Paul was a lifesaver! Stopped the leak and cleaned up afterwards.'),
  (v_job4_id, v_bob_id, 'approved', 'Great work. Hot water is instant now.'),
  (v_job5_id, v_alice_id, 'approved', 'Carl is a true craftsman. The cabinets are beautiful.')
  ON CONFLICT (job_id) DO UPDATE SET 
    status = EXCLUDED.status,
    comment = EXCLUDED.comment;

END $$;
