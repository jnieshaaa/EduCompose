-- Storage setup for essay file uploads
-- This script creates the storage bucket and sets up access policies

-- Create the essays storage bucket (if it doesn't exist)
-- Note: This needs to be run in the Supabase SQL Editor

-- First, create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('essays', 'essays', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to the essays bucket
DROP POLICY IF EXISTS "Authenticated users can upload essays" ON storage.objects;
CREATE POLICY "Authenticated users can upload essays"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'essays' AND
  (storage.foldername(name))[1] = 'essays'
);

-- Allow authenticated users to read files from the essays bucket
DROP POLICY IF EXISTS "Authenticated users can read essays" ON storage.objects;
CREATE POLICY "Authenticated users can read essays"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'essays');

-- Allow authenticated users to update files in the essays bucket (for re-uploads if needed)
DROP POLICY IF EXISTS "Authenticated users can update essays" ON storage.objects;
CREATE POLICY "Authenticated users can update essays"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'essays')
WITH CHECK (bucket_id = 'essays');

-- Allow authenticated users to delete files from the essays bucket
DROP POLICY IF EXISTS "Authenticated users can delete essays" ON storage.objects;
CREATE POLICY "Authenticated users can delete essays"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'essays');

