--------------------------------------------------------------------------------
-- 10_storage.sql — Supabase storage bucket for essay uploads
--------------------------------------------------------------------------------

-- Create the essays storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('essays', 'essays', false)
ON CONFLICT (id) DO NOTHING;

-- Upload
DROP POLICY IF EXISTS "Authenticated users can upload essays" ON storage.objects;
CREATE POLICY "Authenticated users can upload essays"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'essays');

-- Read
DROP POLICY IF EXISTS "Authenticated users can read essays" ON storage.objects;
CREATE POLICY "Authenticated users can read essays"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'essays');

-- Update
DROP POLICY IF EXISTS "Authenticated users can update essays" ON storage.objects;
CREATE POLICY "Authenticated users can update essays"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'essays')
  WITH CHECK (bucket_id = 'essays');

-- Delete
DROP POLICY IF EXISTS "Authenticated users can delete essays" ON storage.objects;
CREATE POLICY "Authenticated users can delete essays"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'essays');
