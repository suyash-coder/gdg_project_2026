-- Migration 00002: Add reputation metrics (Ratings and Repeat Customers)

-- 1. Add fields to customer_attestations
ALTER TABLE customer_attestations
  ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5),
  ADD COLUMN review text;

-- 2. Add fields to profiles
ALTER TABLE profiles
  ADD COLUMN average_rating numeric(3,1),
  ADD COLUMN rating_count integer NOT NULL DEFAULT 0,
  ADD COLUMN repeat_customers integer NOT NULL DEFAULT 0;

-- 3. Replace the reputation trigger function
CREATE OR REPLACE FUNCTION fn_update_reputation()
RETURNS trigger AS $$
DECLARE
  v_worker_id uuid;
  v_score integer;
  v_avg numeric(3,1);
  v_rating_count integer;
  v_repeat integer;
BEGIN
  -- Get worker_id from the job referenced by this attestation
  SELECT j.worker_id INTO v_worker_id
  FROM jobs j WHERE j.id = COALESCE(NEW.job_id, OLD.job_id);

  IF v_worker_id IS NOT NULL THEN
    -- Calculate Attestation Count (Reputation Score)
    SELECT COUNT(*) INTO v_score
    FROM customer_attestations ca
    JOIN jobs j ON j.id = ca.job_id
    WHERE j.worker_id = v_worker_id
      AND ca.status = 'approved';

    -- Calculate Average Rating and Rating Count
    SELECT
      ROUND(AVG(ca.rating)::numeric, 1),
      COUNT(ca.rating)
    INTO v_avg, v_rating_count
    FROM customer_attestations ca
    JOIN jobs j ON j.id = ca.job_id
    WHERE j.worker_id = v_worker_id
      AND ca.status = 'approved'
      AND ca.rating IS NOT NULL;

    -- Calculate Repeat Customers
    SELECT COUNT(*) INTO v_repeat
    FROM (
      SELECT ca.customer_id
      FROM customer_attestations ca
      JOIN jobs j ON j.id = ca.job_id
      WHERE j.worker_id = v_worker_id
        AND ca.status = 'approved'
      GROUP BY ca.customer_id
      HAVING COUNT(*) >= 2
    ) sub;

    UPDATE profiles
    SET
      reputation_score = v_score,
      average_rating = v_avg,
      rating_count = v_rating_count,
      repeat_customers = v_repeat
    WHERE id = v_worker_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate public_profiles view to include new fields
DROP VIEW IF EXISTS public_profiles;
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  p.id,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.city,
  p.reputation_score,
  p.average_rating,
  p.rating_count,
  p.repeat_customers
FROM profiles p
WHERE p.is_public = true;
