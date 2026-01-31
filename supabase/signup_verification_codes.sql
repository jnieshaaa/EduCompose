--------------------------------------------------------------------------------
-- Signup verification codes table
-- Stores 6-digit codes for email verification during sign-up (frontend + EmailJS)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS signup_verification_codes (
  id         bigserial PRIMARY KEY,
  email      text NOT NULL,
  code       text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signup_verification_codes_email_idx ON signup_verification_codes(email);
CREATE INDEX IF NOT EXISTS signup_verification_codes_expires_idx ON signup_verification_codes(expires_at);

-- RLS: Allow anonymous insert (frontend stores codes before user exists)
ALTER TABLE signup_verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert signup codes" ON signup_verification_codes;
CREATE POLICY "Allow anon insert signup codes"
  ON signup_verification_codes FOR INSERT
  TO anon
  WITH CHECK (true);

-- RPC: Verify code without exposing it. Anon can execute.
CREATE OR REPLACE FUNCTION verify_signup_code(p_email text, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_found boolean;
BEGIN
  WITH deleted AS (
    DELETE FROM signup_verification_codes
    WHERE email = lower(trim(p_email))
      AND code = p_code
      AND expires_at > now()
    RETURNING 1
  )
  SELECT EXISTS(SELECT 1 FROM deleted) INTO v_found;
  RETURN COALESCE(v_found, false);
END;
$$;

GRANT EXECUTE ON FUNCTION verify_signup_code(text, text) TO anon;
GRANT EXECUTE ON FUNCTION verify_signup_code(text, text) TO authenticated;
