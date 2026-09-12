-- =====================================================================
-- WorkProof — Database Migration
-- Migration: 00003_evidence_bucket_and_hashes.sql
--
-- 1. Create the 'evidence' bucket if it doesn't exist
-- 2. Add 'sha256' and 'perceptual_hash' to 'job_media'
-- =====================================================================

-- 1. Ensure the 'evidence' bucket exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'evidence'
-- (We use DO block to safely catch if policies already exist)
DO $$
BEGIN
  -- Select Policy: Only job participants can view the evidence
  BEGIN
    CREATE POLICY storage_evidence_select ON storage.objects FOR SELECT USING (
      bucket_id = 'evidence'
      AND EXISTS (
        SELECT 1 FROM public.job_media jm
        JOIN public.jobs j ON j.id = jm.job_id
        WHERE jm.storage_path = storage.objects.name
          AND (j.worker_id = auth.uid() OR j.customer_id = auth.uid())
      )
    );
  EXCEPTION
    WHEN duplicate_object THEN null;
  END;

  -- Insert Policy: Authenticated users can insert
  BEGIN
    CREATE POLICY storage_evidence_insert ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'evidence'
      AND auth.uid() IS NOT NULL
    );
  EXCEPTION
    WHEN duplicate_object THEN null;
  END;
END $$;


-- 2. Add 'sha256' and 'perceptual_hash' columns to 'job_media'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_media' AND column_name = 'sha256'
  ) THEN
    ALTER TABLE public.job_media ADD COLUMN sha256 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_media' AND column_name = 'perceptual_hash'
  ) THEN
    ALTER TABLE public.job_media ADD COLUMN perceptual_hash text;
  END IF;
END $$;
