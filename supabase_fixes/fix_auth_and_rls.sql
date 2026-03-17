-- OPTION A FIX: Create a public user or student when auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role text;
BEGIN
  -- Extract role from metadata, default to 'student' if missing
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  IF user_role = 'teacher' THEN
    -- Insert into users table
    INSERT INTO public.users (auth_user_id, email, role, created_at, updated_at)
    VALUES (NEW.id, NEW.email, 'teacher', NOW(), NOW());
  ELSE
    -- Insert into students table
    INSERT INTO public.students (auth_user_id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- OPTION B FIX: Allow authenticated users to create notifications
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications"
ON public.notifications
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
