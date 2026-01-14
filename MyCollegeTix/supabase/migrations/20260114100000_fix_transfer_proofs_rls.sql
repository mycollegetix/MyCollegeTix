-- Fix transfer proofs RLS policy to allow name-based folders instead of UUID

-- Drop the old UUID-based policy
DROP POLICY IF EXISTS "Users can upload own transfer proofs" ON storage.objects;

-- Allow any authenticated user to upload to transfer-proofs bucket
-- The folder structure uses user names, so we just verify authentication
CREATE POLICY "Authenticated users can upload transfer proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'transfer-proofs'
  AND auth.role() = 'authenticated'
);

-- Drop old view policies that used UUID
DROP POLICY IF EXISTS "Users can view own transfer proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage own transfer proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own transfer proofs" ON storage.objects;

-- Authenticated users can view/manage files in this bucket
-- (Admins policy and buyers policy remain for dispute resolution)
CREATE POLICY "Authenticated users can view transfer proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transfer-proofs'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update transfer proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'transfer-proofs'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete transfer proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'transfer-proofs'
  AND auth.role() = 'authenticated'
);
