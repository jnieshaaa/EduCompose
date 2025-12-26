import { ArrowLeft, UserPlus, Mail, Lock } from "lucide-react";
import { AuthInputField } from "./AuthInputField";

interface SignUpFormProps {
  fullName: string;
  setFullName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  error: string;
  setError: (error: string) => void;
  success: string;
  isLoading: boolean;
  onSubmit: (e?: React.FormEvent) => void;
  onViewChange: (view: "login" | "signup" | "forgot-password") => void;
}

export function SignUpForm({
  fullName,
  setFullName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  error,
  setError,
  success,
  isLoading,
  onSubmit,
  onViewChange,
}: SignUpFormProps) {
  return (
    <>
      <button
        onClick={() => onViewChange("login")}
        className="flex items-center text-neutral-600 mb-4 hover:text-primary-500 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
      </button>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-neutral-900 mb-2">
          Create Account
        </h2>
        <p className="text-neutral-900">Join EduCompose today!</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Success Message */}
        {success && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <AuthInputField
          id="signup-fullname"
          label="Full Name"
          type="text"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            setError("");
          }}
          placeholder="Enter your full name"
          Icon={UserPlus}
        />
        <AuthInputField
          id="signup-email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          placeholder="Enter your email"
          Icon={Mail}
        />
        <AuthInputField
          id="signup-password"
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder="Create a password (min 6 characters)"
          Icon={Lock}
          showToggle
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />
        <AuthInputField
          id="signup-confirm-password"
          label="Confirm Password"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setError("");
          }}
          placeholder="Confirm your password"
          Icon={Lock}
          showToggle
          showPassword={showConfirmPassword}
          setShowPassword={setShowConfirmPassword}
        />

        {/* Sign Up Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full text-white py-3 rounded-lg font-semibold bg-primary-500 shadow-lg hover:bg-primary-600 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus className="w-5 h-5 mr-2" />{" "}
          {isLoading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>
    </>
  );
}

