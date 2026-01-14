-- Create storage bucket for transfer proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transfer-proofs',
  'transfer-proofs',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Users can upload transfer proofs to their own folder
CREATE POLICY "Users can upload own transfer proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'transfer-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own transfer proofs
CREATE POLICY "Users can view own transfer proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transfer-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update/delete their own transfer proofs
CREATE POLICY "Users can manage own transfer proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'transfer-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own transfer proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'transfer-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all transfer proofs (for dispute resolution)
CREATE POLICY "Admins can view all transfer proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transfer-proofs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Buyers can view proofs for their orders (for transparency)
CREATE POLICY "Buyers can view transfer proofs for their orders"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transfer-proofs'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.buyer_id = auth.uid()
    AND (storage.foldername(name))[2] = o.id::text
  )
);
