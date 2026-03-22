-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- e.g., 'create_activity', 'grade_essay', 'create_rubric'
    description TEXT NOT NULL, -- e.g., 'Created activity: Midterm Essay'
    metadata JSONB DEFAULT '{}'::jsonB, -- Optional extra data
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
-- Admins can view all logs
DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_logs;
CREATE POLICY "Admins can view all activity logs"
ON activity_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
    )
);

-- Teachers can view their own logs
DROP POLICY IF EXISTS "Users can view their own logs" ON activity_logs;
CREATE POLICY "Users can view their own logs"
ON activity_logs FOR SELECT
TO authenticated
USING (
    user_id IN (
        SELECT id FROM users
        WHERE auth_user_id = auth.uid()
    )
);

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS activity_logs_action_type_idx ON activity_logs(action_type);
