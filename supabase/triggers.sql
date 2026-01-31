--------------------------------------------------------------------------------
-- Database Trigger: Auto-create user record when user signs up
-- This trigger automatically creates a corresponding record in the users
-- table whenever a new user is created in Supabase auth.users
--------------------------------------------------------------------------------

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    auth_user_id,
    email,
    full_name,
    first_name,
    middle_name,
    last_name,
    role,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'middle_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(
      NEW.raw_user_meta_data->>'role',
      'teacher'
    ),
    true
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that fires after a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

