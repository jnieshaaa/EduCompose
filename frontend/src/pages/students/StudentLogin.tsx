import React, { useState } from "react";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useAuth,
} from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";

// Minimal typed shape for Supabase user metadata
interface UserMetadata {
  full_name?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

interface StudentRow {
  id: number;
  student_code: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string | null;
  is_active: boolean;
}

interface StudentLoginLookup {
  student_id: string;  // uuid
  student_code: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  is_active: boolean;
}
const Login: React.FC = () => {
  const [studentCode, setStudentCode] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Load remembered student code on mount
  React.useEffect(() => {
    const savedCode = localStorage.getItem("rememberedStudentCode");
    if (savedCode) {
      setStudentCode(savedCode);
      setRememberMe(true);
    }
  }, []);

  const buildStudentName = (
    student: Pick<
      StudentRow,
      "first_name" | "middle_name" | "last_name" | "student_code" | "email"
    >,
  ) => {
    const parts = [student.first_name, student.middle_name, student.last_name]
      .map((value) => value?.trim())
      .filter(Boolean);
    return (
      parts.join(" ") || student.student_code || student.email || "Student"
    );
  };

  const handleForgotPassword = async () => {
    const normalizedStudentCode = studentCode.trim();
    if (!normalizedStudentCode) {
      setError("Enter your student code first so we can send a reset link.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const { data: studentIdentity, error: lookupError } = await supabase
        .rpc("get_student_login_email", {
          p_student_code: normalizedStudentCode,
        })
        .maybeSingle<StudentLoginLookup>();

      if (lookupError) {
        throw lookupError;
      }

      if (!studentIdentity?.email) {
        setError(
          "Student code not found or no email is assigned to this student.",
        );
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        studentIdentity.email,
        {
          redirectTo: `${window.location.origin}/`,
        },
      );

      if (resetError) {
        throw resetError;
      }

      setError("Password reset link sent. Please check your email.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to send reset link.");
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);

    try {

      const normalizedStudentCode = studentCode.trim();
      const compactStudentCode = normalizedStudentCode.replace(/\s+/g, "");
      const uppercaseStudentCode = compactStudentCode.toUpperCase();

      // Try multiple safe student-code formats to avoid case/spacing mismatches.
      const tryLookup = async (code: string) =>
        supabase
          .rpc("get_student_login_email", {
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

      if (!studentIdentity.is_active) {
        setError(
          "Your student account is inactive. Please contact your teacher.",
        );
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: studentIdentity.email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (error) {
        const normalizedMessage = error.message.toLowerCase();
        if (
          normalizedMessage.includes("invalid login credentials") ||
          normalizedMessage.includes("email not confirmed") ||
          normalizedMessage.includes("invalid email or password")
        ) {
          setError("Invalid student code or password.");
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
          id: studentIdentity.student_id,
          auth_id: data.user.id,
          email: studentIdentity.email.trim().toLowerCase() || data.user.email || "",
          username: studentIdentity.student_code,
          full_name:
            ((data.user.user_metadata as UserMetadata)?.full_name as
              | string
              | undefined) ??
            buildStudentName({
              first_name: studentIdentity.first_name,
              middle_name: studentIdentity.middle_name,
              last_name: studentIdentity.last_name,
              student_code: studentIdentity.student_code,
              email: studentIdentity.email,
            }),
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

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <h1 className="text-4xl font-bold mb-2 text-white">
              Edu<span className="text-primary-50">Compose</span>
            </h1>
            <p className="text-white/90 font-medium text-sm">
              Student Portal for Essay Evaluation
            </p>
          </div>

          <div className="rounded-2xl shadow-2xl bg-white p-8 md:p-10 border border-white/20">
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
                    onChange={(e) => {
                      setStudentCode(e.target.value);
                      setError("");
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    placeholder="Enter your student code"
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
                  onClick={handleForgotPassword}
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

            <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
              <p className="text-xs text-neutral-500 leading-relaxed italic">
                Manage your student account through your teacher or administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
