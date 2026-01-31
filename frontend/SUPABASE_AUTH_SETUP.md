# Supabase Auth Setup (Frontend + EmailJS)

Sign-up, verification, and login run entirely on the frontend—no backend required.

## EmailJS Configuration

Set these in your `.env`:

```
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

Optional: `VITE_EMAILJS_SIGNUP_TEMPLATE_ID` for a different signup email template.

Your EmailJS template should use `{{verification_code}}` and optionally `{{to_email}}`, `{{message}}`.

## Supabase Setup

1. **Run the migration**: In Supabase SQL Editor, run `supabase/signup_verification_codes.sql` to create the table, RLS policy, and `verify_signup_code` RPC.

2. **Disable email confirmation**: Go to **Authentication** → **Providers** → **Email** and turn **OFF** "Confirm email". Our flow uses EmailJS for the 6-digit code instead of Supabase's magic link.

## Flow

- **Sign up**: User enters email + password → 6-digit code generated → stored in Supabase → sent via EmailJS
- **Verify**: User enters code → RPC `verify_signup_code` validates → Supabase user created → logged in
- **Resend**: New code generated, stored, sent via EmailJS
- **Login**: `supabase.auth.signInWithPassword()` — unchanged
