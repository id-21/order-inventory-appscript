-- =====================================================
-- Supabase Storage Bucket Setup
-- Run this in Supabase SQL Editor before deployment
-- =====================================================

-- Create storage bucket for stock movement images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stock-movement-images',
  'stock-movement-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png'];

-- Drop existing policies if they exist, then recreate (idempotent)
DROP POLICY IF EXISTS "Public read access for stock images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload stock images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update stock images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete stock images" ON storage.objects;

-- Allow public read access to images
CREATE POLICY "Public read access for stock images"
ON storage.objects FOR SELECT
USING (bucket_id = 'stock-movement-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload stock images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stock-movement-images');

-- Allow authenticated users to update their own images
CREATE POLICY "Authenticated users can update stock images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'stock-movement-images');

-- Allow authenticated users to delete their own images
CREATE POLICY "Authenticated users can delete stock images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'stock-movement-images');

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'stock-movement-images';
