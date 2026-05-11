-- ============================================================
-- Migration 027: Harden Supabase Storage upload policies
--
-- Frontend uploads go through the NestJS backend, which uses the
-- service role key. Anonymous direct uploads are not required and
-- should not be allowed in production.
-- ============================================================

DROP POLICY IF EXISTS "Anyone can upload to attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload own attachments" ON storage.objects;

CREATE POLICY "Authenticated users can upload own attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
);
