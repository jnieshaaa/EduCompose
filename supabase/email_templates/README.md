# Email Template Configuration Guide

This directory contains custom email templates for Supabase authentication.

## Files

- `confirm_signup.html` - Email confirmation template for new user signups

## Setup Instructions

### 1. Configure Email Template in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Select **Confirm signup** template
4. Copy the contents of `confirm_signup.html` into the template editor
5. Update the logo image source (see below)

### 2. Update Logo in Email Template

The email template currently uses a placeholder logo. You have two options:

#### Option A: Host the Logo (Recommended)
1. Upload `EduCompose.png` to a public CDN or your website
2. Replace the placeholder image URL in the template:
   ```html
   <img src="YOUR_LOGO_URL_HERE" alt="EduCompose Logo" />
   ```

#### Option B: Embed Logo as Base64
1. Convert your logo to base64:
   ```bash
   # Using Node.js
   node -e "console.log('data:image/png;base64,' + require('fs').readFileSync('EduCompose.png').toString('base64'))"
   ```
2. Replace the placeholder image with:
   ```html
   <img src="data:image/png;base64,YOUR_BASE64_STRING" alt="EduCompose Logo" />
   ```

### 3. Configure Redirect URL

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Set the **Site URL** to your production domain (e.g., `https://yourdomain.com`)
3. Add redirect URLs:
   - `https://yourdomain.com/auth/confirm` (for email confirmation)
   - `http://localhost:5173/auth/confirm` (for local development)

### 4. Available Template Variables

Supabase provides these variables in email templates:
- `{{ .ConfirmationURL }}` - The confirmation link URL
- `{{ .SiteURL }}` - Your configured site URL
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - Confirmation token (if needed)

### 5. Testing

1. Test the email template by signing up a new user
2. Check that the email renders correctly in different email clients
3. Verify that clicking the confirmation link opens the modal on your website

## Customization

The template uses your brand colors:
- Primary: `#0791B2`
- Primary Light: `#10C9F6`
- Text: `#333333`
- Background: `#f5f5f5`

You can customize these colors in the `<style>` section of the HTML template.

## Notes

- The email template is responsive and works on mobile devices
- The confirmation link will redirect to `/auth/confirm` route which shows a success modal
- Make sure your frontend route `/auth/confirm` is properly configured in your React app

