import emailjs from '@emailjs/browser';

/**
 * Configure these in your EmailJS Dashboard (https://dashboard.emailjs.com/)
 */

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "";
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "";

// Templates
const FORGOT_PASSWORD_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "";
const STUDENT_WELCOME_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_STUDENT_TEMPLATE_ID || "";

/**
 * Sends a verification code for forgot password or teacher registration
 */
export const sendCodeEmail = async (params: {
  toEmail: string;
  code: string;
}) => {
  if (!SERVICE_ID || !FORGOT_PASSWORD_TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn("EmailJS (Code) not configured. Skipping email.");
    return;
  }

  try {
    return await emailjs.send(
      SERVICE_ID,
      FORGOT_PASSWORD_TEMPLATE_ID,
      {
        to_email: params.toEmail,
        verification_code: params.code,
        message: `Your verification code is: ${params.code}`,
      },
      PUBLIC_KEY
    );
  } catch (error) {
    console.error("EmailJS Error (Code):", error);
    throw error;
  }
};

/**
 * Sends a welcome email to students with their login credentials
 */
export const sendStudentWelcomeEmail = async (params: {
  to_name: string;
  to_email: string;
  student_code: string;
  temp_password: string;
}) => {
  // Fallback to FORGOT_PASSWORD_TEMPLATE_ID if student-specific one isn't set
  const templateId = STUDENT_WELCOME_TEMPLATE_ID || FORGOT_PASSWORD_TEMPLATE_ID;

  if (!SERVICE_ID || !templateId || !PUBLIC_KEY) {
    console.warn("EmailJS (Student) not configured. Skipping email.");
    return;
  }

  try {
    return await emailjs.send(
      SERVICE_ID,
      templateId,
      {
        to_name: params.to_name,
        to_email: params.to_email,
        student_code: params.student_code,
        temp_password: params.temp_password,
        login_url: `${window.location.origin}/Student/Login`,
      },
      PUBLIC_KEY
    );
  } catch (error) {
    console.error("EmailJS Error (Student):", error);
    throw error;
  }
};

// Alias for existing usages
export const sendSignupCodeEmail = sendCodeEmail;
