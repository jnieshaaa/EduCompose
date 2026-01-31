import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAuth,
  DESIGN_MODE_ENABLED,
  DESIGN_MODE_TOKEN,
  DESIGN_MODE_USER,
} from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { authApi } from "../api";
import { sendCodeEmail, sendSignupCodeEmail } from "../services/emailService";

interface UserMetadata {
  full_name?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

export type AuthView = "login" | "signup" | "forgot-password";

export type SignupStep = "form" | "accountCreated" | "verifyCode";

export function useAuthModal(onClose: () => void) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [view, setView] = useState<AuthView>("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Signup form state (email + password only; no confirm password)
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupStep, setSignupStep] = useState<SignupStep>("form");
  const [signupVerificationCode, setSignupVerificationCode] = useState("");
  const [isVerifyingSignup, setIsVerifyingSignup] = useState(false);
  const [isResendingSignupCode, setIsResendingSignupCode] = useState(false);

  useEffect(() => {
    if (view !== "signup") {
      setSignupStep("form");
      setSignupVerificationCode("");
    }
  }, [view]);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPasswordStep, setForgotPasswordStep] = useState<
    "email" | "code" | "password"
  >("email");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Handle login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setLoginError("");

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Please enter both email and password");
      return;
    }

    setIsLoggingIn(true);

    try {
      if (DESIGN_MODE_ENABLED) {
        login(DESIGN_MODE_TOKEN, DESIGN_MODE_USER);
        navigate("/Teacher/Dashboard");
        onClose();
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword.trim(),
      });

      if (error) {
        throw error;
      }

      if (data.session && data.user) {
        const userMeta = (data.user.user_metadata || {}) as UserMetadata;
        const fullName =
          (userMeta.full_name as string | undefined) ||
          (userMeta.name as string | undefined) ||
          data.user.email?.split("@")[0] ||
          "Teacher";

        login(data.session.access_token, {
          id: data.user.id,
          email: data.user.email ?? "",
          username: data.user.email ?? "",
          full_name: fullName,
          role: (userMeta.role as string) || "teacher",
          is_active: true,
          email_verified: !!data.user.email_confirmed_at,
        });

        const role = (userMeta.role as string) || "teacher";
        if (role === "admin") {
          navigate("/Admin/Dashboard");
        } else if (role === "student") {
          navigate("/Student/Dashboard");
        } else {
          navigate("/Teacher/Dashboard");
        }
        onClose();
      } else {
        setLoginError(
          "Authentication failed. Please check your email and password.",
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setLoginError(
        message ||
          "Authentication failed. Please check your credentials and try again.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Password requirements for signup (match first image)
  const signupPasswordValid =
    signupPassword.length >= 8 &&
    /[A-Z]/.test(signupPassword) &&
    /[a-z]/.test(signupPassword) &&
    /\d/.test(signupPassword);

  // Generate 6-digit signup code
  const generateSignupCode = (): string =>
    Math.floor(100000 + Math.random() * 900000).toString();

  // Handle signup: generate code → store in Supabase → send via EmailJS → show "Account Created"
  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setSignupError("");
    setSignupSuccess("");

    if (!signupEmail.trim() || !signupPassword.trim()) {
      setSignupError("Please fill in email and password.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail.trim())) {
      setSignupError("Please enter a valid email address.");
      return;
    }

    if (!signupPasswordValid) {
      setSignupError(
        "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.",
      );
      return;
    }

    setIsSigningUp(true);

    try {
      const code = generateSignupCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase
        .from("signup_verification_codes")
        .insert({
          email: signupEmail.trim().toLowerCase(),
          code,
          expires_at: expiresAt,
        });

      if (insertError) throw insertError;

      await sendSignupCodeEmail({
        toEmail: signupEmail.trim(),
        code,
      });

      setSignupStep("accountCreated");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSignupError(message || "Registration failed. Please try again.");
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleSignupGotIt = () => {
    setSignupStep("verifyCode");
    setSignupVerificationCode("");
    setSignupError("");
  };

  const handleVerifySignupCode = async () => {
    setSignupError("");
    if (signupVerificationCode.length !== 6) {
      setSignupError("Please enter the complete 6-digit code.");
      return;
    }

    setIsVerifyingSignup(true);
    try {
      const { data: isValid, error: rpcError } = await supabase.rpc(
        "verify_signup_code",
        {
          p_email: signupEmail.trim(),
          p_code: signupVerificationCode,
        },
      );

      if (rpcError) throw rpcError;
      if (!isValid) {
        setSignupError("Invalid or expired code. Please try again.");
        return;
      }

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: signupEmail.trim(),
          password: signupPassword,
          options: {
            data: {
              full_name: signupEmail.trim().split("@")[0],
              role: "teacher",
            },
          },
        });

      if (signUpError) {
        if (signUpError.message?.includes("already registered")) {
          setSignupError("Email already registered.");
          return;
        }
        throw signUpError;
      }

      if (signUpData.user?.identities?.length === 0) {
        setSignupError("Email already registered.");
        return;
      }

      if (signUpData.session && signUpData.user) {
        const userMeta = (signUpData.user.user_metadata || {}) as UserMetadata;
        login(signUpData.session.access_token, {
          id: signUpData.user.id,
          email: signUpData.user.email ?? "",
          username: signUpData.user.email ?? "",
          full_name:
            (userMeta.full_name as string) ||
            (userMeta.name as string) ||
            signUpData.user.email?.split("@")[0] ||
            "Teacher",
          role: (userMeta.role as string) || "teacher",
          is_active: true,
          email_verified: true,
        });
        const role = (userMeta.role as string) || "teacher";
        if (role === "admin") navigate("/Admin/Dashboard");
        else if (role === "student") navigate("/Student/Dashboard");
        else navigate("/Teacher/Dashboard");
        onClose();
      } else {
        setSignupSuccess(
          "Account created! Please log in with your email and password.",
        );
        setView("login");
        setLoginEmail(signupEmail.trim());
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSignupError(message || "Verification failed. Please try again.");
    } finally {
      setIsVerifyingSignup(false);
    }
  };

  const handleResendSignupCode = async () => {
    setSignupError("");
    setIsResendingSignupCode(true);
    try {
      const code = generateSignupCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase
        .from("signup_verification_codes")
        .insert({
          email: signupEmail.trim().toLowerCase(),
          code,
          expires_at: expiresAt,
        });

      if (insertError) throw insertError;

      await sendSignupCodeEmail({
        toEmail: signupEmail.trim(),
        code,
      });

      setSignupSuccess("Verification code sent again to your email.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSignupError(message || "Failed to resend code.");
    } finally {
      setIsResendingSignupCode(false);
    }
  };

  // Generate 6-digit code
  const generateCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Store code in sessionStorage
  const storeCode = (email: string, code: string): void => {
    const codeData = {
      code,
      email,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    sessionStorage.setItem(`reset_code_${email}`, JSON.stringify(codeData));
  };

  // Verify code from sessionStorage
  const verifyCode = (email: string, code: string): boolean => {
    const storedData = sessionStorage.getItem(`reset_code_${email}`);
    if (!storedData) {
      return false;
    }

    try {
      const { code: storedCode, expiresAt } = JSON.parse(storedData);
      if (Date.now() > expiresAt) {
        sessionStorage.removeItem(`reset_code_${email}`);
        return false;
      }
      return storedCode === code;
    } catch {
      return false;
    }
  };

  // Handle forgot password - Step 1: Send code
  const handleSendCode = async () => {
    setForgotPasswordError("");
    setForgotPasswordSuccess("");

    if (!forgotEmail.trim()) {
      setForgotPasswordError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail.trim())) {
      setForgotPasswordError("Please enter a valid email address");
      return;
    }

    setIsSendingCode(true);

    try {
      // FIRST: Check if email exists in Supabase BEFORE sending code
      const checkResult = await authApi.checkEmail(forgotEmail.trim());

      // If email doesn't exist, STOP here - don't send code
      if (!checkResult.exists) {
        setForgotPasswordError(
          checkResult.message || "No account found with this email address.",
        );
        return;
      }

      // Email exists - NOW generate and send code via EmailJS
      const code = generateCode();
      storeCode(forgotEmail.trim(), code);

      await sendCodeEmail({
        toEmail: forgotEmail.trim(),
        code,
      });

      setForgotPasswordSuccess("Verification code sent to your email!");
      setForgotPasswordStep("code");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setForgotPasswordError(
        message || "Failed to send verification code. Please try again.",
      );
    } finally {
      setIsSendingCode(false);
    }
  };

  // Handle forgot password - Step 2: Verify code
  const handleVerifyCode = async () => {
    setForgotPasswordError("");

    if (verificationCode.length !== 6) {
      setForgotPasswordError("Please enter the complete 6-digit code");
      return;
    }

    setIsVerifyingCode(true);

    try {
      const isValid = verifyCode(forgotEmail.trim(), verificationCode);

      if (!isValid) {
        setForgotPasswordError("Invalid or expired code. Please try again.");
        return;
      }

      setForgotPasswordStep("password");
      setForgotPasswordSuccess(
        "Code verified! Please enter your new password.",
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setForgotPasswordError(
        message || "Verification failed. Please try again.",
      );
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Handle forgot password - Step 3: Reset password
  const handleResetPassword = async () => {
    setForgotPasswordError("");
    setForgotPasswordSuccess("");

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setForgotPasswordError("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotPasswordError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setForgotPasswordError("Password must be at least 6 characters long");
      return;
    }

    // Verify code again before resetting
    const isValid = verifyCode(forgotEmail.trim(), verificationCode);
    if (!isValid) {
      setForgotPasswordError("Verification code expired. Please start over.");
      setForgotPasswordStep("email");
      setVerificationCode("");
      return;
    }

    setIsResettingPassword(true);

    try {
      // Use backend API to reset password (which uses Supabase Admin API server-side)
      const result = await authApi.resetPassword(
        forgotEmail.trim(),
        newPassword.trim(),
      );

      if (!result.success) {
        throw new Error(result.message || "Failed to reset password");
      }

      // Clear the stored verification code
      sessionStorage.removeItem(`reset_code_${forgotEmail.trim()}`);

      setForgotPasswordSuccess(
        "Password reset successfully! You can now log in with your new password.",
      );

      setTimeout(() => {
        setView("login");
        // Reset state
        setForgotEmail("");
        setVerificationCode("");
        setNewPassword("");
        setConfirmPassword("");
        setForgotPasswordStep("email");
        setForgotPasswordError("");
        setForgotPasswordSuccess("");
      }, 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setForgotPasswordError(
        message || "Failed to reset password. Please try again.",
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  return {
    view,
    setView,
    // Login state
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    showLoginPassword,
    setShowLoginPassword,
    loginError,
    setLoginError,
    isLoggingIn,
    handleLogin,
    // Signup state (no confirm password)
    signupEmail,
    setSignupEmail,
    signupPassword,
    setSignupPassword,
    showSignupPassword,
    setShowSignupPassword,
    signupError,
    setSignupError,
    signupSuccess,
    isSigningUp,
    handleSignUp,
    signupStep,
    setSignupStep,
    signupVerificationCode,
    setSignupVerificationCode,
    handleSignupGotIt,
    handleVerifySignupCode,
    handleResendSignupCode,
    isVerifyingSignup,
    isResendingSignupCode,
    // Forgot password state
    forgotEmail,
    setForgotEmail,
    forgotPasswordStep,
    setForgotPasswordStep,
    verificationCode,
    setVerificationCode,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    forgotPasswordError,
    setForgotPasswordError,
    forgotPasswordSuccess,
    setForgotPasswordSuccess,
    isSendingCode,
    isVerifyingCode,
    isResettingPassword,
    handleSendCode,
    handleVerifyCode,
    handleResetPassword,
  };
}
