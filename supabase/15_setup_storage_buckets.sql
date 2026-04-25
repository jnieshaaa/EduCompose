-- 15_SETUP_STORAGE_BUCKETS.SQL
-- Purpose: Initialize Supabase Storage buckets and policies for EduCompose
-- Bucket: 'essays' (Public or Private depending on security needs, here we use Private with RLS)

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('essays', 'essays', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on the storage.objects table (Standard Supabase practice)
-- Note: Supabase Storage uses the 'storage.objects' table for all files across all buckets

-- 3. Policies for 'essays' bucket
-- Allow students to upload their own essays
DROP POLICY IF EXISTS "Students can upload essays" ON storage.objects;
CREATE POLICY "Students can upload essays" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'essays' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow students to view their own essays
DROP POLICY IF EXISTS "Students can view own essays" ON storage.objects;
CREATE POLICY "Students can view own essays" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'essays' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow teachers/admins to view student essays
DROP POLICY IF EXISTS "Staff can view all essays" ON storage.objects;
CREATE POLICY "Staff can view all essays" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'essays' AND
    (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (role = 'teacher' OR role = 'admin')
        )
    )
);

-- Allow deletion of own essays
DROP POLICY IF EXISTS "Students can delete own essays" ON storage.objects;
CREATE POLICY "Students can delete own essays" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'essays' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
