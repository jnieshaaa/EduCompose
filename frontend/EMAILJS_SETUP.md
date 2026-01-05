# EmailJS Setup Guide

This guide will help you set up EmailJS to send verification codes for the forgot password feature.

## Step 1: Create an EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click **"Sign Up"** or **"Get Started"**
3. Create a free account (free tier includes 200 emails/month)
4. Verify your email address

## Step 2: Add an Email Service

1. Log in to your EmailJS dashboard
2. Go to **"Email Services"** in the left sidebar
3. Click **"Add New Service"**
4. Choose your email provider (Gmail, Outlook, etc.)
5. Follow the setup instructions for your provider:
   - **Gmail**: Authorize EmailJS to access your Gmail account
   - **Outlook**: Sign in with your Microsoft account
   - **Other providers**: Follow their specific instructions
6. Click **"Create Service"**
7. **Copy the Service ID** - you'll need this for `VITE_EMAILJS_SERVICE_ID`

## Step 3: Create an Email Template

1. Go to **"Email Templates"** in the left sidebar
2. Click **"Create New Template"**
3. Choose a template or start from scratch
4. Configure the template with these variables:
   - `{{to_email}}` - Recipient's email address
   - `{{verification_code}}` - The 6-digit code
   - `{{message}}` - The message (already includes the code)

### Sample Template:

**Subject:** Password Reset Verification Code - EduCompose

**Content:**

```html
<div
  style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6; color: #0F172A; max-width: 600px; margin: 0 auto;"
>
  <!-- Header with Logo and Branding -->
  <div
    style="background: linear-gradient(135deg, #045568 0%, #067D99 50%, #08A5CB 100%); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;"
  >
    <h1
      style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: bold; letter-spacing: -0.5px;"
    >
      Edu<span style="color: #10C9F6;">Compose</span>
    </h1>
    <p
      style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;"
    >
      Teacher's Companion for Essay Evaluation
    </p>
  </div>

  <!-- Main Content -->
  <div
    style="background: #FFFFFF; padding: 32px 24px; border: 1px solid #E0F2FE; border-top: none; border-radius: 0 0 8px 8px;"
  >
    <p
      style="margin: 0 0 24px 0; padding-top: 24px; border-top: 1px solid #E0F2FE; color: #475569;"
    >
      To reset your password, please use the following verification code:
    </p>

    <!-- Verification Code Display -->
    <div
      style="background: #F0FDFE; border: 2px solid #0791B2; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;"
    >
      <p
        style="margin: 0 0 8px 0; color: #475569; font-size: 14px; font-weight: 500;"
      >
        Your Verification Code
      </p>
      <p
        style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #045568; font-family: 'Courier New', monospace;"
      >
        {{verification_code}}
      </p>
    </div>

    <p style="margin: 0 0 24px 0; color: #64748B; font-size: 14px;">
      This code will expire in
      <strong style="color: #045568;">10 minutes</strong>.
    </p>

    <!-- Security Notice -->
    <div
      style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0; border-radius: 4px;"
    >
      <p style="margin: 0; color: #92400E; font-size: 13px; line-height: 1.5;">
        <strong>Security Notice:</strong> Do not share this code with anyone.
        EduCompose will never contact you about this email or ask for any
        verification codes or links. Beware of phishing scams.
      </p>
    </div>

    <p style="margin: 24px 0 0 0; color: #64748B; font-size: 14px;">
      If you didn't request this password reset, you can safely ignore this
      email.
    </p>

    <p
      style="margin: 32px 0 0 0; padding-top: 24px; border-top: 1px solid #E0F2FE; color: #475569; font-size: 14px;"
    >
      Thanks for using EduCompose!<br />
      <span style="color: #64748B; font-size: 13px;">The EduCompose Team</span>
    </p>
  </div>

  <!-- Footer -->
  <div
    style="text-align: center; padding: 24px; color: #94A3B8; font-size: 12px;"
  >
    <p style="margin: 0;">© 2024 EduCompose. All rights reserved.</p>
  </div>
</div>
```

5. Click **"Save"**
6. **Copy the Template ID** - you'll need this for `VITE_EMAILJS_TEMPLATE_ID`

## Step 4: Get Your Public Key

1. Go to **"Account"** → **"General"** in the left sidebar
2. Find **"API Keys"** section
3. Copy your **Public Key** (starts with "user\_")
4. This is your `VITE_EMAILJS_PUBLIC_KEY`

## Step 5: Configure Environment Variables

1. In your project root (`frontend` folder), create or edit `.env.local` file
2. Add the following variables:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=your_template_id_here
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
```

**Example:**

```env
VITE_EMAILJS_SERVICE_ID=service_abc123
VITE_EMAILJS_TEMPLATE_ID=template_xyz789
VITE_EMAILJS_PUBLIC_KEY=user_abcdefghijklmnopqrstuvwx
```

3. Save the file
4. **Important:** Restart your development server after adding environment variables

## Step 6: Test the Setup

1. Make sure your development server is running:

   ```bash
   npm run dev
   ```

2. Navigate to the login page and click "Forgot Password"
3. Enter an email address
4. Click "Send Verification Code"
5. Check the email inbox for the verification code

## Troubleshooting

### Email not received?

- Check spam/junk folder
- Verify the email service is properly connected in EmailJS dashboard
- Check EmailJS dashboard → "Activity" for any errors
- Ensure you haven't exceeded the free tier limit (200 emails/month)

### "EmailJS is not configured" error?

- Make sure `.env.local` file exists in the `frontend` folder
- Verify all three environment variables are set correctly
- Restart your development server after adding environment variables
- Check that variable names start with `VITE_` (required for Vite)

### Code not being sent?

- Check browser console for errors
- Verify EmailJS service and template IDs are correct
- Check EmailJS dashboard → "Activity" for sending status
- Ensure the email template variables match: `{{to_email}}`, `{{verification_code}}`, `{{message}}`

## Security Notes

- **Never commit `.env.local` to version control** (it should already be in `.gitignore`)
- The Public Key is safe to expose in frontend code (it's designed for client-side use)
- For production, use environment variables on your hosting platform
- Consider upgrading to a paid plan for higher email limits in production

## EmailJS Free Tier Limits

- 200 emails per month
- Basic email templates
- All standard features

For production use, consider upgrading to a paid plan for:

- Higher email limits
- Priority support
- Advanced features
