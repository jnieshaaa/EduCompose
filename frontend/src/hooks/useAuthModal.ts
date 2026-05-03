import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAuth,
} from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { authApi } from "../api";
import { sendCodeEmail, sendSignupCodeEmail } from "../services/emailService";
import { useNotification } from "../contexts/NotificationContext";

export type AuthView = "login" | "signup" | "forgot-password";

export type SignupStep = "form" | "accountCreated" | "verifyCode";

interface StaffValidation {
  account_exists: boolean;
  id: string;
  role: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

export function useAuthModal(onClose: () => void) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showNotification } = useNotification();
  const [view, setView] = useState<AuthView>("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRememberMe, setLoginRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedLoginEmail");
    if (savedEmail) {
      setLoginEmail(savedEmail);
      setLoginRememberMe(true);
    }
  }, []);

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] =
    useState(false);
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
      // Modular Pre-login Validation
      const { data: validation, error: vError } = await supabase.rpc(
        "api_validate_staff_credentials",
        { p_email: loginEmail.trim() }
      ).maybeSingle<StaffValidation>();

      if (vError) throw vError;
      
      if (!validation || !validation.account_exists) {
        setLoginError("Account not found. Please double-check your email.");
        setIsLoggingIn(false);
        return;
      }

      if (!validation.is_active) {
        setLoginError("Your account is currently inactive. Please contact the administrator.");
        setIsLoggingIn(false);
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
        // Fetch role from the public 'users' table (source of truth)
        const { data: userData } = await supabase
          .from("users")
          .select("role, first_name, last_name")
          .eq("id", data.user.id)
          .maybeSingle();

        let role = "teacher"; // Default
        let firstName = data.user.email?.split("@")[0] || "User";
        let lastName = "";

        if (userData) {
          role = userData.role;
          firstName = userData.first_name || firstName;
          lastName = userData.last_name || "";
        } else {
          // If not in Teacher/Admin role, check if it's a student in users table
          const { data: studentData } = await supabase
            .from("users")
            .select("id, first_name, last_name")
            .eq("id", data.user.id)
            .eq("role", "student")
            .maybeSingle();
          
          if (studentData) {
            role = "student";
            firstName = studentData.first_name || "";
            lastName = studentData.last_name || "";
          }
        }

        // Block students from logging in via the Teacher/Admin portal
        if (role === "student") {
          await supabase.auth.signOut({ scope: 'local' });
          setLoginError(
            "Student accounts must use the Student Login page."
          );
          setIsLoggingIn(false);
          return;
        }

        // Handle Remember Me
        if (loginRememberMe) {
          localStorage.setItem("rememberedLoginEmail", loginEmail.trim());
        } else {
          localStorage.removeItem("rememberedLoginEmail");
        }

        login(data.session.access_token, {
          id: data.user.id,
          auth_id: data.user.id,
          email: data.user.email ?? "",
          username: data.user.email ?? "",
          first_name: firstName,
          last_name: lastName,
          role,
          is_active: true,
          email_verified: !!data.user.email_confirmed_at,
        });

        if (role === "admin") {
          navigate("/Admin/Dashboard");
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

  // Handle signup: generate code â†’ store in Supabase â†’ send via EmailJS â†’ show "Account Created"
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
    const normalizedEmail = signupEmail.trim().toLowerCase();

    try {
      // 1. Check if email is already in use (fast fail)
      const checkResult = await authApi.checkEmail(normalizedEmail);
      if (checkResult.exists) {
        setSignupError(checkResult.message || "Email already registered.");
        setIsSigningUp(false);
        return;
      }

      // 2. Create the unconfirmed auth user.
      // We deliberately do NOT confirm it here â€” confirmation happens after OTP verify.
      // 2. We skip supabase.auth.signUp() to avoid 429 rate limits.
      // We will create the user via RPC ONLY after they verify their email code.


      // 3. Store OTP and send verification email
      const code = generateSignupCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase
        .from("signup_verification_codes")
        .insert({ email: normalizedEmail, code, expires_at: expiresAt });

      if (insertError) throw insertError;

      await sendSignupCodeEmail({ toEmail: signupEmail.trim(), code });

      setSignupStep("accountCreated");
      startResendTimer();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSignupError(message || "Registration failed. Please try again.");
    } finally {
      setIsSigningUp(false);
    }
  };

  // Signup countdown timer
  const [resendTimer, setResendTimer] = useState(0);

  // Handle countdown logic
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const startResendTimer = () => {
    setResendTimer(60);
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
    const normalizedEmail = signupEmail.trim().toLowerCase();

    try {
      // Step 1: Verify OTP
      const { data: isValid, error: rpcError } = await supabase.rpc(
        "verify_signup_code",
        { p_email: normalizedEmail, p_code: signupVerificationCode },
      );

      if (rpcError) throw rpcError;
      if (!isValid) {
        setSignupError("Invalid or expired code. Please try again.");
        return;
      }

      // Step 2: Create the user account using standard Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: signupPassword,
        options: {
          data: {
            first_name: normalizedEmail.split("@")[0],
            role: "teacher"
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Failed to create account.");

      // Step 3: Create the public profile via secure RPC (Bypasses RLS)
      const { error: profileError } = await supabase.rpc('create_profile_v1', {
        p_id: signUpData.user.id,
        p_email: normalizedEmail,
        p_role: 'teacher',
        p_first_name: normalizedEmail.split("@")[0]
      });

      if (profileError) {
        console.error("[Signup] Profile Creation Error:", profileError);
      }

      // Step 4: Show Success and Switch to Login View (As requested)
      showNotification('success', "Account created! Please log in to continue.");
      setSignupSuccess("Account created successfully! You can now log in.");
      
      // Delay slightly then switch view
      setTimeout(() => {
        setView("login");
        setLoginEmail(signupEmail);
        setSignupEmail("");
        setSignupPassword("");
        setSignupVerificationCode("");
      }, 2000);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Signup] Error:", message);
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
      startResendTimer();
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
        setForgotPasswordError("No account found with this email address.");
        return;
      }

      // Email exists - NOW generate and send code via EmailJS
      const code = generateCode();
      storeCode(forgotEmail.trim(), code);

      await sendCodeEmail({
        toEmail: forgotEmail.trim(),
        code,
        toName: "User",
      });

      setForgotPasswordSuccess("Verification code sent to your email!");
      showNotification('success', "Verification code sent to your email!");
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
      showNotification('success', "Code verified! Please enter your new password.");
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
    loginRememberMe,
    setLoginRememberMe,
    // Signup state
    signupEmail,
    setSignupEmail,
    signupPassword,
    setSignupPassword,
    signupConfirmPassword,
    setSignupConfirmPassword,
    showSignupPassword,
    setShowSignupPassword,
    showSignupConfirmPassword,
    setShowSignupConfirmPassword,
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
    resendTimer,
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
