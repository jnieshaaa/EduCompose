-- ==========================================
-- FIX ACTIVITY LOGS RLS POLICY
-- Purpose: Allow authenticated users to insert logs
-- ==========================================

-- 1. Ensure RLS is enabled
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing if any
DROP POLICY IF EXISTS "Allow authenticated users to insert logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can view own logs" ON public.activity_logs;

-- 3. Create policies
CREATE POLICY "Allow authenticated users to insert logs" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view own logs" 
ON public.activity_logs 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all logs" 
ON public.activity_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
