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
  toName?: string;
}) => {
  if (!SERVICE_ID || !FORGOT_PASSWORD_TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn("EmailJS (Code) not configured. Skipping email.");
    return;
  }

  const loginUrl = `${window.location.origin}/Login`;

  try {
    return await emailjs.send(
      SERVICE_ID,
      FORGOT_PASSWORD_TEMPLATE_ID,
      {
        to_name: params.toName || "User",
        to_email: params.toEmail,
        verification_code: params.code,
        temp_password: params.code, // Fallback for some templates
        password_label: "Verification Code",
        instruction: "To reset your password, please use the following verification code:",
        message: `Your verification code is: ${params.code}`,
        login_url: loginUrl,
      },
      PUBLIC_KEY
    );
  } catch (error) {
    console.error("EmailJS Error (Code):", error);
    throw error;
  }
};

/**
 * Sends a welcome email to any user type (Admin, Teacher, Student)
 */
export const sendUserWelcomeEmail = async (params: {
  to_name: string;
  to_email: string;
  role: string;
  temp_password: string;
  student_code?: string;
}) => {
  const isStudent = params.role.toLowerCase() === 'student';
  const templateId = isStudent 
    ? (STUDENT_WELCOME_TEMPLATE_ID || FORGOT_PASSWORD_TEMPLATE_ID) 
    : FORGOT_PASSWORD_TEMPLATE_ID;

  if (!SERVICE_ID || !templateId || !PUBLIC_KEY) {
    console.warn("EmailJS not configured. Skipping email.");
    return;
  }

  const loginUrl = isStudent 
    ? `${window.location.origin}/Student/Login` 
    : `${window.location.origin}/Login`;

  try {
    return await emailjs.send(
      SERVICE_ID,
      templateId,
      {
        to_name: params.to_name,
        to_email: params.to_email,
        role: params.role,
        student_code: params.student_code || "N/A",
        temp_password: params.temp_password,
        verification_code: params.temp_password, // For backward compatibility
        password_label: isStudent ? "Initial Password" : "Temporary Password",
        instruction: isStudent 
          ? "Welcome! Please use your student code and the initial password below to access your account."
          : "Please use the code below as your initial password to log in.",
        login_url: loginUrl,
        message: `Welcome to EduCompose! Your ${params.role} account has been created. Please use this password to log in: ${params.temp_password}`,
      },
      PUBLIC_KEY
    );
  } catch (error) {
    console.error("EmailJS Error:", error);
    throw error;
  }
};

/**
 * Sends a welcome email to students (Legacy wrapper)
 */
export const sendStudentWelcomeEmail = async (params: {
  to_name: string;
  to_email: string;
  student_code: string;
  temp_password: string;
}) => {
  return sendUserWelcomeEmail({
    ...params,
    role: 'student'
  });
};

// Alias for existing usages
export const sendSignupCodeEmail = sendCodeEmail;
