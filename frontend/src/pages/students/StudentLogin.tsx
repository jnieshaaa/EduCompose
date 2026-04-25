import React, { useState, useEffect } from "react";
import { User, Lock, Eye, EyeOff, Mail, Loader2, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { supabase } from "../../lib/supabaseClient";
import { sendSignupCodeEmail, sendCodeEmail } from "../../services/emailService";
import { authApi } from "../../api";


interface StudentLoginLookup {
  id: string;  // uuid
  student_code: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  is_active: boolean;
  onboarding_completed: boolean;
  birthday: string | null;
  is_provisioned: boolean;
}

const Login: React.FC = () => {
  // View states for swapping Login <-> Verification <-> Forgot Password
  const [view, setView] = useState<"login" | "verification" | "forgot-password">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [pendingStudent, setPendingStudent] = useState<StudentLoginLookup | null>(null);
  const [pendingPassword, setPendingPassword] = useState("");

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

  // Verification state
  const [otp, setOtp] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [timer, setTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
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
      
      const exists = Array.isArray(checkData) ? checkData[0]?.user_exists : checkData?.user_exists;

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

  const handleStartVerification = async (studentToVerify?: StudentLoginLookup) => {
    const student = studentToVerify || pendingStudent;
    if (!student?.email) return;
    
    setIsSendingCode(true);
    // Clear old OTP if any
    setOtp("");
    
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase
        .from("signup_verification_codes")
        .insert({
          email: student.email.toLowerCase(),
          code: code,
          expires_at: expiresAt,
        });

      if (insertError) throw insertError;

      await sendSignupCodeEmail({
        toEmail: student.email,
        code: code,
      });
      
      showNotification('success', "Verification code sent to your email!");
      setOtpSent(true);
      setTimer(60);
    } catch (err: any) {
      showNotification('error', err.message || "Failed to send code");
    } finally {
      setIsSendingCode(false);
    }
  };

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Auto-focus first box when code is sent or reset
  useEffect(() => {
    if (otpSent && otp === "") {
      setTimeout(() => {
        document.getElementById('otp-0')?.focus();
      }, 100);
    }
  }, [otpSent, otp]);

  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || !pendingStudent) {
      showNotification('error', "Please enter the complete 6-digit code.");
      return;
    }

    setIsVerifying(true);
    try {
      // Step 1: Verify the OTP code
      const { data: isValid, error: rpcError } = await supabase.rpc(
        "verify_signup_code",
        {
          p_email: pendingStudent.email,
          p_code: otp,
        },
      );

      if (rpcError) throw rpcError;
      if (!isValid) {
        showNotification('error', "Invalid or expired code.");
        return;
      }

      const finalPassword = pendingPassword || pendingStudent.birthday || "EduCompose2025!";
      const normalizedEmail = pendingStudent.email.trim().toLowerCase();

      // Step 2: Use the existing admin_provision_student RPC (SECURITY DEFINER,
      // now granted to anon) to create a CONFIRMED auth user with proper identities.
      // This avoids supabase.auth.signUp() which creates unconfirmed users.
      const { data: authUserId, error: provisionError } = await supabase.rpc(
        "create_new_portal_user_v1",
        {
          p_email: normalizedEmail,
          p_password: finalPassword,
          p_first_name: pendingStudent.first_name,
          p_last_name: pendingStudent.last_name,
          p_role: 'student',
          p_code: pendingStudent.student_code,
          p_middle_name: pendingStudent.middle_name || null,
        }
      );

      if (provisionError) throw provisionError;
      if (!authUserId) throw new Error("Failed to provision auth account.");

      // Step 3: Sign in with the now-confirmed credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: finalPassword,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("invalid login credentials")) {
          throw new Error(
            "Account setup succeeded but login failed. Please go back to Login and try with your password, or use 'Forgot password'."
          );
        }
        throw signInError;
      }

      if (!signInData.user) throw new Error("Could not sign in after verification.");

      showNotification('success', "Email verified successfully!");

      // Step 5: Log the user into the app context
      if (signInData.session) {
        login(signInData.session.access_token, {
          id: authUserId as string, // After linking/provisioning, we use the new ID
          auth_id: authUserId as string,
          email: normalizedEmail,
          username: pendingStudent.student_code,
          first_name: pendingStudent.first_name,
          last_name: pendingStudent.last_name,
          role: "student",
          is_active: pendingStudent.is_active,
          email_verified: true,
        });
      }

      // Handle Remember Me
      if (rememberMe) {
        localStorage.setItem("rememberedStudentCode", pendingStudent.student_code);
      } else {
        localStorage.removeItem("rememberedStudentCode");
      }

      // Navigate to Onboarding
      navigate("/Student/Onboarding", {
        state: {
          student: {
            ...pendingStudent,
            id: authUserId as string,
          },
        },
      });

    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
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
      const normalizedStudentCode = studentCode.trim();
      const compactStudentCode = normalizedStudentCode.replace(/\s+/g, "");
      const uppercaseStudentCode = compactStudentCode.toUpperCase();

      // Try multiple safe student-code formats to avoid case/spacing mismatches.
      const tryLookup = async (code: string) =>
        supabase
          .rpc("get_student_login_email_v1", {
            p_student_code: code,
          })
          .maybeSingle<StudentLoginLookup>();

      let lookup = await tryLookup(normalizedStudentCode);
      if ((!lookup.data || !lookup.data.email) && compactStudentCode !== normalizedStudentCode) {
        lookup = await tryLookup(compactStudentCode);
      }
      if ((!lookup.data || !lookup.data.email) && uppercaseStudentCode !== compactStudentCode) {
        lookup = await tryLookup(uppercaseStudentCode);
      }

      const { data: studentIdentity, error: lookupError } = lookup;
      if (lookupError) {
        throw lookupError;
      }

      if (!studentIdentity?.email) {
        setError("Invalid student code or password.");
        return;
      }

      // In the unified schema, studentIdentity.id IS the identity.
      // If it's not a valid UUID yet (placeholder from enrollment), 
      // we'll handle it during provisioning.
      let effectiveAuthId = studentIdentity.id;

      if (!studentIdentity.is_active) {
        setError(
          "Your student account is inactive. Please contact your teacher.",
        );
        return;
      }

      // STATE 1: Not Provisioned Yet -> Show Verification View
      // We check is_provisioned which tells us if the user exists in auth.users
      if (!studentIdentity.is_provisioned) {
        setPendingStudent(studentIdentity);
        setPendingPassword(password.trim());
        setError("");
        setView("verification");
        return;
      }

      // STATE 2: Verified, but Not Onboarded (effectiveAuthId exists, onboarding_completed is false)
      if (!studentIdentity.onboarding_completed) {
        // Authenticate first, then go to Onboarding
        const { data, error } = await supabase.auth.signInWithPassword({
          email: studentIdentity.email.trim().toLowerCase(),
          password: password.trim(),
        });

        if (error) {
          setError("Invalid student code or password.");
          return;
        }

        if (data.session && data.user) {
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
          
          // Handle Remember Me
          if (rememberMe) {
            localStorage.setItem("rememberedStudentCode", studentIdentity.student_code);
          } else {
            localStorage.removeItem("rememberedStudentCode");
          }
          
          navigate("/Student/Onboarding", { state: { student: { ...studentIdentity, id: effectiveAuthId } } });
          return;
        }
      }

      // STATE 3: Verified AND Onboarded
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
        
        // Handle specialized 400 errors from Supabase
        if (error.status === 400) {
          setError("Login failed (Bad Request). This often happens if the account is in a transition state. Try refreshing the page.");
          return;
        }

        throw error;
      }
      if (data.session && data.user) {
        // Handle Remember Me
        if (rememberMe) {
          localStorage.setItem("rememberedStudentCode", normalizedStudentCode);
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
        navigate("/Student/Dashboard");
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

  const renderVerificationForm = () => (
    <div className="duration-300">
      <button 
        onClick={() => {
           setView("login");
           setOtpSent(false);
           setOtp("");
        }}
        className="flex items-center text-xs text-neutral-500 hover:text-neutral-900 font-bold tracking-wide uppercase group mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
        Back to Login
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Verify Email</h2>
        <p className="text-neutral-600 text-sm">
          Secure your academic records by verifying your registered email address first.
        </p>
      </div>

      {!otpSent ? (
        <div className="space-y-6">
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Registered Email
            </label>
            <p className="font-bold text-neutral-900 break-all text-sm">
              {pendingStudent?.email || "No email assigned"}
            </p>
          </div>
          
          <button
            onClick={() => handleStartVerification()}
            disabled={isSendingCode}
            className="w-full bg-primary hover:bg-primary-600 disabled:bg-neutral-200 text-white font-bold py-2.5 text-sm rounded-lg shadow-lg transition-all active:translate-y-[0px] hover:-translate-y-[1px] flex items-center justify-center gap-2"
          >
            {isSendingCode ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Code...</span>
              </>
            ) : "Send Verification Code"}
          </button>
        </div>
      ) : (
        <div className="space-y-6 text-center">
          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-600">Enter the 6-digit code sent to your email</p>
          </div>

          <div className="flex justify-center gap-2 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                maxLength={1}
                value={otp[i] || ""}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  if (!val) return;
                  const newOtp = otp.split("");
                  newOtp[i] = val;
                  setOtp(newOtp.join(""));
                  if (i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !otp[i] && i > 0) {
                    document.getElementById(`otp-${i - 1}`)?.focus();
                    const currentOtp = otp.split("");
                    currentOtp[i-1] = "";
                    setOtp(currentOtp.join(""));
                  }
                }}
                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-white border-2 border-neutral-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
              />
            ))}
          </div>

          <div className="space-y-4">
            <button
              onClick={handleVerifyOtp}
              disabled={isVerifying || otp.length < 6}
              className="w-full bg-primary hover:bg-primary-600 disabled:bg-neutral-200 disabled:opacity-70 text-white font-bold py-2.5 text-sm rounded-lg shadow-lg transition-all active:translate-y-[0px] hover:-translate-y-[1px] flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : "Verify & Continue"}
            </button>
            
            <button
              disabled={timer > 0 || isSendingCode}
              onClick={() => handleStartVerification()}
              className="text-primary font-bold hover:underline disabled:text-neutral-400 disabled:no-underline text-xs"
            >
              {timer > 0 ? `Resend code in ${timer}s` : "Didn't get the code? Resend"}
            </button>
          </div>
        </div>
      )}
    </div>
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
      case "verification": return renderVerificationForm();
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
