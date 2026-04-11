-- ============================================================
-- Migration 022: Create Storage bucket & policies for attachments
-- This ensures the 'attachments' bucket exists, is public,
-- and that authenticated users can upload/manage their files.
-- ============================================================

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  true,                                          -- PUBLIC bucket = anyone can read
  5242880,                                       -- 5 MB max
  ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[];

-- 2. Allow anyone (including anonymous) to READ objects
CREATE POLICY IF NOT EXISTS "Public read access on attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- 3. Allow anyone to UPLOAD objects (frontend uses anon key; real auth is handled by NestJS)
CREATE POLICY IF NOT EXISTS "Anyone can upload to attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
);

-- 4. Allow authenticated users to UPDATE their own objects
CREATE POLICY IF NOT EXISTS "Authenticated users can update own attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'attachments'
  AND auth.uid()::text = owner::text
);

-- 5. Allow authenticated users to DELETE their own objects
CREATE POLICY IF NOT EXISTS "Authenticated users can delete own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments'
  AND auth.uid()::text = owner::text
);
