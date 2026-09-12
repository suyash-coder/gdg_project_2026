-- =====================================================================
-- WorkProof — Initial Database Schema
-- Migration: 00001_initial_schema.sql
--
-- Creates all enums, tables, indexes, triggers, views, and RLS policies.
-- =====================================================================

-- ── Enums ────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('worker', 'customer', 'admin');
CREATE TYPE job_status AS ENUM ('pending', 'in_progress', 'completed', 'disputed', 'cancelled');
CREATE TYPE media_type AS ENUM ('photo', 'video', 'document');
CREATE TYPE attestation_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved_for_worker', 'resolved_for_customer', 'dismissed');
CREATE TYPE flag_severity AS ENUM ('low', 'medium', 'high', 'critical');


-- ── Tables ───────────────────────────────────────────────────────────

-- 1. profiles
CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'worker',
  display_name  text,
  bio           text,
  avatar_url    text,
  city          text,
  is_public     boolean NOT NULL DEFAULT false,
  reputation_score integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_profiles_is_public ON profiles(is_public);

-- 2. skills
CREATE TABLE skills (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  category    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. worker_skills (junction)
CREATE TABLE worker_skills (
  worker_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id    uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (worker_id, skill_id)
);

-- 4. jobs
CREATE TABLE jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title         text NOT NULL,
  description   text,
  status        job_status NOT NULL DEFAULT 'pending',
  location      text,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_worker ON jobs(worker_id);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_status ON jobs(status);

-- 5. job_media
CREATE TABLE job_media (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  uploader_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_type    media_type NOT NULL,
  storage_path  text NOT NULL,
  caption       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_media_job ON job_media(job_id);

-- 6. verification_tokens
CREATE TABLE verification_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_tokens_job ON verification_tokens(job_id);

-- 7. customer_attestations
CREATE TABLE customer_attestations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       attestation_status NOT NULL DEFAULT 'pending',
  comment      text,
  attested_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id)  -- Prevents double attestation
);

CREATE INDEX idx_attestations_customer ON customer_attestations(customer_id);

-- 8. customer_photo_consents
CREATE TABLE customer_photo_consents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consented_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_photo_consents_job ON customer_photo_consents(job_id);

-- 9. disputes
CREATE TABLE disputes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  filed_by    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  status      dispute_status NOT NULL DEFAULT 'open',
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_job ON disputes(job_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- 10. fraud_flags
CREATE TABLE fraud_flags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flagged_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason          text NOT NULL,
  severity        flag_severity NOT NULL DEFAULT 'low',
  reviewed_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fraud_flags_target ON fraud_flags(target_user_id);

-- 11. admin_actions
CREATE TABLE admin_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id   uuid NOT NULL,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_id);


-- ── Triggers ─────────────────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_jobs_updated
  BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_disputes_updated
  BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, role, display_name)
  VALUES (
    NEW.id,
    'worker',
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- Derived reputation: count approved attestations for the worker
CREATE OR REPLACE FUNCTION fn_update_reputation()
RETURNS trigger AS $$
DECLARE
  v_worker_id uuid;
  v_score integer;
BEGIN
  -- Get worker_id from the job referenced by this attestation
  SELECT j.worker_id INTO v_worker_id
  FROM jobs j WHERE j.id = COALESCE(NEW.job_id, OLD.job_id);

  IF v_worker_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_score
    FROM customer_attestations ca
    JOIN jobs j ON j.id = ca.job_id
    WHERE j.worker_id = v_worker_id
      AND ca.status = 'approved';

    UPDATE profiles SET reputation_score = v_score WHERE id = v_worker_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_attestation_reputation
  AFTER INSERT OR UPDATE OR DELETE ON customer_attestations
  FOR EACH ROW EXECUTE FUNCTION fn_update_reputation();


-- ── Helper function for role checks ──────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ── Views ────────────────────────────────────────────────────────────

-- Public profile view: only public fields of public profiles
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  p.id,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.city,
  p.reputation_score
FROM profiles p
WHERE p.is_public = true;


-- ── RLS Policies ─────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_photo_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- ── profiles ──

-- Anyone can view public profiles; users can see their own profile
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  is_public = true OR auth.uid() = id
);

-- Users can only update their own profile
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
  auth.uid() = id
) WITH CHECK (
  auth.uid() = id
);

-- ── skills (read-only for all, admin insert/update/delete) ──

CREATE POLICY skills_select ON skills FOR SELECT
  USING (true);

CREATE POLICY skills_admin_insert ON skills FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY skills_admin_update ON skills FOR UPDATE
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY skills_admin_delete ON skills FOR DELETE
  USING (get_user_role(auth.uid()) = 'admin');

-- ── worker_skills ──

-- Workers can manage their own skills
CREATE POLICY worker_skills_select ON worker_skills FOR SELECT
  USING (true);

CREATE POLICY worker_skills_insert ON worker_skills FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY worker_skills_delete ON worker_skills FOR DELETE
  USING (auth.uid() = worker_id);

-- ── jobs ──

-- Participants can view their own jobs; admins can view all
CREATE POLICY jobs_select ON jobs FOR SELECT USING (
  auth.uid() = worker_id
  OR auth.uid() = customer_id
  OR get_user_role(auth.uid()) = 'admin'
);

-- Authenticated users can create jobs
CREATE POLICY jobs_insert ON jobs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = worker_id);

-- Workers and customers of the job can update
CREATE POLICY jobs_update ON jobs FOR UPDATE USING (
  auth.uid() = worker_id OR auth.uid() = customer_id
) WITH CHECK (
  auth.uid() = worker_id OR auth.uid() = customer_id
);

-- ── job_media ──

-- Only job participants can view media
CREATE POLICY job_media_select ON job_media FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_media.job_id
      AND (j.worker_id = auth.uid() OR j.customer_id = auth.uid())
  )
  OR get_user_role(auth.uid()) = 'admin'
);

-- Only job participants can upload media
CREATE POLICY job_media_insert ON job_media FOR INSERT WITH CHECK (
  auth.uid() = uploader_id
  AND EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_media.job_id
      AND (j.worker_id = auth.uid() OR j.customer_id = auth.uid())
  )
);

-- ── verification_tokens (server-only via service role) ──

-- No client access — all operations go through admin client
CREATE POLICY verification_tokens_deny_all ON verification_tokens
  FOR ALL USING (false);

-- ── customer_attestations ──

-- Participants and admins can view
CREATE POLICY attestations_select ON customer_attestations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = customer_attestations.job_id
      AND (j.worker_id = auth.uid() OR j.customer_id = auth.uid())
  )
  OR get_user_role(auth.uid()) = 'admin'
);

-- Customer of the job can insert (UNIQUE(job_id) prevents double attestation)
CREATE POLICY attestations_insert ON customer_attestations FOR INSERT WITH CHECK (
  auth.uid() = customer_id
  AND EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = customer_attestations.job_id
      AND j.customer_id = auth.uid()
  )
);

-- ── customer_photo_consents ──

CREATE POLICY photo_consents_select ON customer_photo_consents FOR SELECT USING (
  auth.uid() = customer_id
  OR EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = customer_photo_consents.job_id
      AND j.worker_id = auth.uid()
  )
  OR get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY photo_consents_insert ON customer_photo_consents FOR INSERT WITH CHECK (
  auth.uid() = customer_id
  AND EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = customer_photo_consents.job_id
      AND j.customer_id = auth.uid()
  )
);

-- ── disputes ──

CREATE POLICY disputes_select ON disputes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = disputes.job_id
      AND (j.worker_id = auth.uid() OR j.customer_id = auth.uid())
  )
  OR get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY disputes_insert ON disputes FOR INSERT WITH CHECK (
  auth.uid() = filed_by
  AND EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = disputes.job_id
      AND (j.worker_id = auth.uid() OR j.customer_id = auth.uid())
  )
);

-- Only admins can update disputes (resolve/dismiss)
CREATE POLICY disputes_update ON disputes FOR UPDATE USING (
  get_user_role(auth.uid()) = 'admin'
);

-- ── fraud_flags (admin only) ──

CREATE POLICY fraud_flags_select ON fraud_flags FOR SELECT USING (
  get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY fraud_flags_insert ON fraud_flags FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY fraud_flags_update ON fraud_flags FOR UPDATE USING (
  get_user_role(auth.uid()) = 'admin'
);

-- ── admin_actions (admin only) ──

CREATE POLICY admin_actions_select ON admin_actions FOR SELECT USING (
  get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY admin_actions_insert ON admin_actions FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'admin' AND auth.uid() = admin_id
);


-- ── Storage ──────────────────────────────────────────────────────────

-- Create the private evidence bucket (if using Supabase Storage)
-- NOTE: In hosted Supabase, bucket creation happens via dashboard or CLI.
-- This is the policy that should be applied:
--
-- INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false);
--
-- CREATE POLICY storage_evidence_select ON storage.objects FOR SELECT USING (
--   bucket_id = 'evidence'
--   AND EXISTS (
--     SELECT 1 FROM job_media jm
--     JOIN jobs j ON j.id = jm.job_id
--     WHERE jm.storage_path = storage.objects.name
--       AND (j.worker_id = auth.uid() OR j.customer_id = auth.uid())
--   )
-- );
--
-- CREATE POLICY storage_evidence_insert ON storage.objects FOR INSERT WITH CHECK (
--   bucket_id = 'evidence'
--   AND auth.uid() IS NOT NULL
-- );
