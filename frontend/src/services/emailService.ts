import emailjs from "@emailjs/browser";

// EmailJS configuration - these should be set in environment variables
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "";

// Initialize EmailJS
if (EMAILJS_PUBLIC_KEY) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

interface SendCodeEmailParams {
  toEmail: string;
  code: string;
}

export const sendCodeEmail = async ({
  toEmail,
  code,
}: SendCodeEmailParams): Promise<void> => {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    throw new Error(
      "EmailJS is not configured. Please set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY environment variables."
    );
  }

  try {
    const templateParams = {
      to_email: toEmail,
      verification_code: code,
      message: `Your password reset code is: ${code}. This code will expire in 10 minutes.`,
    };

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
  } catch (error) {
    console.error("Error sending email via EmailJS:", error);
    throw new Error("Failed to send verification code. Please try again.");
  }
};
