--------------------------------------------------------------------------------
-- 25_teacher_management.sql
-- Variable-Free & Permission-Safe RPC for account provisioning.
-- This version skips 'DROP FUNCTION' and 'CREATE INDEX' to avoid ownership errors.
--------------------------------------------------------------------------------

-- Create the SAFE function directly
-- We skip DROP lines here because they require ownership of the function
CREATE OR REPLACE FUNCTION public.provision_credential_account(
  p_email        text,
  p_password     text,
  p_first_name   text,
  p_last_name    text,
  p_role         text,
  p_middle_name  text DEFAULT NULL,
  p_suffix       text DEFAULT NULL,
  p_code         text DEFAULT NULL,
  p_birthday     text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $body$
BEGIN
  -- 1. Handle Auth account (Create or Update)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = lower(trim(p_email))) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      lower(trim(p_email)), crypt(p_password, gen_salt('bf')),
      now(), '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object(
        'first_name', p_first_name, 
        'last_name', p_last_name, 
        'role', p_role, 
        'middle_name', p_middle_name,
        'suffix', p_suffix
      ),
      now(), now(), '', '', '', false
    );

    -- Create identity using subquery
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) 
    SELECT 
      id, id, format('{"sub":"%s", "email":"%s"}', id, email)::jsonb,
      'email', id::text, now(), now(), now()
    FROM auth.users 
    WHERE email = lower(trim(p_email));
  ELSE
    -- Update existing auth metadata
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(p_password, gen_salt('bf')),
      raw_user_meta_data = jsonb_build_object(
        'first_name', p_first_name, 
        'last_name', p_last_name, 
        'role', p_role, 
        'middle_name', p_middle_name,
        'suffix', p_suffix
      ),
      updated_at = now()
    WHERE email = lower(trim(p_email));
  END IF;

  -- 2. Synchronize to public.users table (Your profile table)
  UPDATE public.users
  SET
    code = COALESCE(p_code, public.users.code),
    birthday = COALESCE(p_birthday, public.users.birthday),
    suffix = COALESCE(p_suffix, public.users.suffix),
    middle_name = COALESCE(p_middle_name, public.users.middle_name),
    first_name = COALESCE(p_first_name, public.users.first_name),
    last_name = COALESCE(p_last_name, public.users.last_name),
    role = p_role
  WHERE email = lower(trim(p_email));

  -- Return the resulting ID
  RETURN (SELECT id FROM auth.users WHERE email = lower(trim(p_email)));
END;
$body$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.provision_credential_account TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_credential_account TO service_role;
