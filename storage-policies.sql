-- Storage policies for pdf-images bucket
-- Run this in your Supabase SQL Editor

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own images" ON storage.objects;

-- Create policies for pdf-images bucket

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'pdf-images' AND
  auth.role() = 'authenticated'
);

-- Allow public access to images (for viewing)
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'pdf-images');

-- Allow authenticated users to update their own images
CREATE POLICY "Allow users to update own images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'pdf-images' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Allow users to delete own images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'pdf-images' AND
  auth.role() = 'authenticated'
);
