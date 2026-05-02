import React, { useState } from "react";
import { User, Lock, Eye, EyeOff, Mail, Loader2, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { supabase } from "../../lib/supabaseClient";
import { sendCodeEmail } from "../../services/emailService";
import { authApi } from "../../api";


interface StudentLoginLookup {
  id: string;  
  student_code: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  is_active: boolean;
  onboarding_completed: boolean;
  birthday: string | null;
  is_provisioned: boolean;
  success?: boolean;
  message?: string;
}

const Login: React.FC = () => {
  // View states for swapping Login <-> Verification <-> Forgot Password
  const [view, setView] = useState<"login" | "forgot-password">("login");
  const [forgotEmail, setForgotEmail] = useState("");

  const [studentCode, setStudentCode] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showNotification } = useNotification();
  
  // Forgot Password detailed state
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"email" | "code" | "password">("email");
  const [forgotVerificationCode, setForgotVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Load remembered student code on mount
  React.useEffect(() => {
    const savedCode = localStorage.getItem("rememberedStudentCode");
    if (savedCode) {
      setStudentCode(savedCode);
      setRememberMe(true);
    }
  }, []);


  const handleForgotPasswordClick = () => {
    setError("");
    setSuccessMessage("");
    setForgotPasswordStep("email");
    setForgotVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setView("forgot-password");
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToReset = forgotEmail.trim();
    if (!emailToReset) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      // 1. Check if user exists using the new secure RPC
      const { data: checkData, error: checkError } = await supabase.rpc(
        "check_user_email_exists",
        { p_email: emailToReset.toLowerCase() }
      );

      if (checkError) throw checkError;
      
      const res = Array.isArray(checkData) ? checkData[0] : checkData;
      const exists = res?.user_exists;

      if (!exists) {
        setError("No account found with this email address.");
        return;
      }

      // 2. Generate and store code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase
        .from("signup_verification_codes")
        .insert({
          email: emailToReset.toLowerCase(),
          code: code,
          expires_at: expiresAt,
        });

      if (insertError) throw insertError;

      // 3. Send email via EmailJS
      await sendCodeEmail({
        toEmail: emailToReset,
        code: code,
        toName: "Student", // Simplified for now
      });

      showNotification('success', "Verification code sent to your email!");
      setSuccessMessage("Verification code sent to your email!");
      setForgotPasswordStep("code");
      setError("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to send reset code.");
      setSuccessMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotVerificationCode.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data: isValid, error: rpcError } = await supabase.rpc(
        "verify_signup_code",
        {
          p_email: forgotEmail.toLowerCase(),
          p_code: forgotVerificationCode,
        },
      );

      if (rpcError) throw rpcError;
      if (!isValid) {
        setError("Invalid or expired code.");
        return;
      }

      showNotification('success', "Code verified! Please enter your new password.");
      setForgotPasswordStep("password");
    } catch (err: any) {
      setError(err.message || "Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsResetting(true);
    setError("");

    try {
      const result = await authApi.resetPassword(
        forgotEmail.trim(),
        newPassword.trim()
      );

      if (!result.success) {
        throw new Error(result.message || "Failed to reset password.");
      }

      showNotification('success', "Password reset successfully! You can now log in.");
      setSuccessMessage("Password reset successfully! Redirecting to login...");
      
      setTimeout(() => {
        setView("login");
        setSuccessMessage("");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setIsResetting(false);
    }
  };



  const handleAuthSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setError("");

    if (!studentCode.trim() || !password.trim()) {
      setError("Please enter both student code and password");
      return;
    }

    const studentCodeRegex = /^\d{3}-\d{4}$/;
    if (!studentCodeRegex.test(studentCode.trim())) {
      setError("Student code must be in XXX-XXXX format (e.g., 123-4567)");
      return;
    }

    setIsLoading(true);

    try {
      // Single source of truth for student validation
      const { data: validationResult, error: validationError } = await supabase.rpc(
        "api_validate_student_credentials",
        {
          p_student_code: studentCode.trim(),
          p_birthday_pass: password.trim(),
        }
      ).maybeSingle<StudentLoginLookup>();

      if (validationError) throw validationError;

      if (!validationResult || !validationResult.success) {
        setError(validationResult?.message || "Invalid student code or password.");
        setIsLoading(false);
        return;
      }

      const studentIdentity = validationResult;
      const effectiveAuthId = studentIdentity.id;

      if (!studentIdentity.is_active) {
        setError("Your student account is inactive. Please contact your teacher.");
        setIsLoading(false);
        return;
      }

      // SIMPLIFIED FLOW: Validate -> Sign In -> Onboarding or Dashboard
      // Sign in with the literal password provided (no normalization)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: studentIdentity.email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (error) {
        const normalizedMessage = error.message.toLowerCase();
        if (
          normalizedMessage.includes("invalid login credentials") ||
          normalizedMessage.includes("email not confirmed") ||
          normalizedMessage.includes("invalid email or password") ||
          normalizedMessage.includes("bad request")
        ) {
          setError("Invalid student code or password. Please double-check your credentials.");
          return;
        }
        throw error;
      }

      if (data.session && data.user) {
        // Handle Remember Me
        if (rememberMe) {
          localStorage.setItem("rememberedStudentCode", studentIdentity.student_code);
        } else {
          localStorage.removeItem("rememberedStudentCode");
        }

        login(data.session.access_token, {
          id: effectiveAuthId,
          auth_id: effectiveAuthId,
          email: studentIdentity.email.trim().toLowerCase() || data.user.email || "",
          username: studentIdentity.student_code,
          first_name: studentIdentity.first_name,
          last_name: studentIdentity.last_name,
          role: "student",
          is_active: studentIdentity.is_active,
          email_verified: !!data.user.email_confirmed_at,
        });

        // First time login -> Onboarding, otherwise -> Dashboard
        if (!studentIdentity.onboarding_completed) {
          navigate("/Student/Onboarding", { 
            state: { 
              student: { 
                ...studentIdentity, 
                id: effectiveAuthId,
                programs_lookup: {
                  name: (studentIdentity as any).program_name,
                  departments: {
                    name: (studentIdentity as any).department_name
                  }
                }
              } 
            } 
          });
        } else {
          navigate("/Student/Dashboard");
        }
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message ||
          "Authentication failed. Please check your credentials and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderLoginForm = () => (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Welcome Back
        </h2>
        <p className="text-neutral-600 text-sm">
          Login with your student code to access your essays
        </p>
      </div>

      <form onSubmit={handleAuthSubmit} className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs flex items-start gap-2 shadow-sm animate-fade-in">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && !error && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-green-700 text-xs flex items-start gap-2 shadow-sm animate-fade-in">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Student Code Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="studentCode"
            className="block text-sm font-medium text-neutral-600"
          >
            Student Code
          </label>
          <div className="relative group">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors w-4 h-4" />
            <input
              id="studentCode"
              type="text"
              value={studentCode}
              maxLength={8}
              onChange={(e) => {
                let val = e.target.value.replace(/[^0-9]/g, "");
                if (val.length > 3) {
                  val = val.slice(0, 3) + "-" + val.slice(3, 7);
                }
                setStudentCode(val);
                setError("");
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all font-mono"
              placeholder="123-4567"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-neutral-600"
          >
            Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors w-4 h-4" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="w-full pl-10 pr-12 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center cursor-pointer group">
            <input 
              type="checkbox" 
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-neutral-300 text-primary focus:ring-primary transition-colors" 
            />
            <span className="ml-2 text-neutral-600 group-hover:text-neutral-800 transition-colors">Remember me</span>
          </label>
          <button
            type="button"
            onClick={handleForgotPasswordClick}
            className="font-bold text-primary hover:text-primary-600 transition-colors"
          >
            Forgot password?
          </button>
        </div>

        {/* Primary Auth Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 text-white py-2.5 text-sm rounded-lg font-bold bg-primary shadow-lg shadow-primary/20 hover:bg-primary-600 hover:translate-y-[-1px] active:translate-y-[0px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Signing in...</span>
            </div>
          ) : (
            "Login to Portal"
          )}
        </button>
      </form>
    </>
  );



  const renderForgotPasswordForm = () => (
    <div className="animate-fade-in text-left">
      <button 
        onClick={() => {
           setView("login");
           setError("");
           setSuccessMessage("");
           setForgotPasswordStep("email");
        }}
        className="flex items-center text-xs text-neutral-500 hover:text-neutral-900 font-bold tracking-wide uppercase group mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
        Back to Login
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Reset Password</h2>
        <p className="text-neutral-600 text-sm">
          {forgotPasswordStep === "email" && "Enter your registered email address and we'll send you a verification code."}
          {forgotPasswordStep === "code" && "Enter the 6-digit verification code sent to your email."}
          {forgotPasswordStep === "password" && "Enter your new password below."}
        </p>
      </div>

      {/* Messages */}
      {(error || successMessage) && (
        <div className="mb-6 space-y-3">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs flex items-start gap-2 shadow-sm animate-fade-in">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {successMessage && !error && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-green-700 text-xs flex items-start gap-2 shadow-sm animate-fade-in">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      )}

      {forgotPasswordStep === "email" && (
        <form onSubmit={handleSendResetEmail} className="space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="forgotEmail" className="block text-sm font-medium text-neutral-600">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors w-4 h-4" />
              <input
                id="forgotEmail"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => {
                  setForgotEmail(e.target.value);
                  setError("");
                }}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary-600 disabled:opacity-50 text-white font-bold py-2.5 text-sm rounded-lg shadow-lg transition-all active:translate-y-[0px] hover:-translate-y-[1px] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Code...</span>
              </>
            ) : "Send Verification Code"}
          </button>
        </form>
      )}

      {forgotPasswordStep === "code" && (
        <form onSubmit={handleVerifyForgotOtp} className="space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="otpCode" className="block text-sm font-medium text-neutral-600 text-center">
              Verification Code
            </label>
            <input
              id="otpCode"
              type="text"
              maxLength={6}
              required
              value={forgotVerificationCode}
              onChange={(e) => {
                setForgotVerificationCode(e.target.value.replace(/[^0-9]/g, ""));
                setError("");
              }}
              className="w-full py-3 text-center text-2xl font-bold tracking-[0.5em] border border-neutral-200 rounded-lg bg-white text-neutral-900 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all font-mono"
              placeholder="000000"
            />
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading || forgotVerificationCode.length < 6}
              className="w-full bg-primary hover:bg-primary-600 disabled:opacity-50 text-white font-bold py-2.5 text-sm rounded-lg shadow-lg transition-all active:translate-y-[0px] hover:-translate-y-[1px] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : "Verify Code"}
            </button>
            <button
              type="button"
              onClick={() => setForgotPasswordStep("email")}
              className="w-full text-neutral-500 font-bold hover:text-neutral-700 text-xs text-center"
            >
              Wait, I entered the wrong email
            </button>
          </div>
        </form>
      )}

      {forgotPasswordStep === "password" && (
        <form onSubmit={handleFinalResetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-600">New Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors w-4 h-4" />
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
                className="w-full pl-10 pr-12 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white text-neutral-900 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-600">Confirm New Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors w-4 h-4" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                className="w-full pl-10 pr-12 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white text-neutral-900 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isResetting}
            className="w-full mt-4 bg-primary hover:bg-primary-600 disabled:opacity-50 text-white font-bold py-2.5 text-sm rounded-lg shadow-lg transition-all active:translate-y-[0px] hover:-translate-y-[1px] flex items-center justify-center gap-2"
          >
            {isResetting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Resetting...</span>
              </>
            ) : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );

  const getActiveView = () => {
    switch (view) {
      case "forgot-password": return renderForgotPasswordForm();
      case "login":
      default: return renderLoginForm();
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row bg-gradient-to-tr from-primary via-primary-400 to-primary overflow-hidden">
      {/* subtle overlay */}
      <div className="absolute inset-0 bg-black/5"></div>

      {/* top-left circle */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/3 -translate-y-1/3"></div>

      {/* bottom-right circle */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/4 translate-y-1/4"></div>

      {/* Left Panel - Branding */}
      <div className="flex-1 hidden lg:flex items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 text-white max-w-md">
          <h1 className="text-5xl font-bold mb-4 tracking-tight">
            Edu<span className="text-primary-50">Compose</span>
          </h1>
          <p className="text-xl font-semibold mb-8">
            Teacher's Companion for Essay Evaluation
          </p>
          <ul className="space-y-4">
            <li className="flex items-start space-x-3">
              <svg
                className="w-6 h-6 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p>AI-powered essay analysis and grading</p>
            </li>
            <li className="flex items-start space-x-3">
              <svg
                className="w-6 h-6 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p>Detailed feedback generation</p>
            </li>
            <li className="flex items-start space-x-3">
              <svg
                className="w-6 h-6 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p>Save time, improve learning outcomes</p>
            </li>
          </ul>
        </div>
      </div>

      {/* Right Panel - Dynamic Content */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md animate-fade-in relative">
          
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <h1 className="text-4xl font-bold mb-2 text-white">
              Edu<span className="text-primary-50">Compose</span>
            </h1>
            <p className="text-white/90 font-medium text-sm">
              Student Portal for Essay Evaluation
            </p>
          </div>

          <div className="rounded-2xl shadow-2xl bg-white p-8 md:p-10 border border-white/20 min-h-[460px] flex flex-col overflow-hidden relative">
            {getActiveView()}
            
            {view === "login" && (
              <div className="mt-auto pt-6 border-t border-neutral-100 text-center relative z-20">
                <p className="text-xs text-neutral-500 leading-relaxed italic">
                  Manage your student account through your teacher or administrator.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
