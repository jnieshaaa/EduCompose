import { ArrowLeft, Mail, Lock } from "lucide-react";
import { AuthInputField } from "./AuthInputField";

interface SignUpFormProps {
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

function checkPasswordRequirements(password: string) {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  };
}

export function SignUpForm({
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
  const req = checkPasswordRequirements(password);
  const allMet = req.minLength && req.hasUpper && req.hasLower && req.hasNumber;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  return (
    <>
      <button
        onClick={() => onViewChange("login")}
        className="flex items-center text-neutral-500 text-xs mb-3 hover:text-primary-500 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
      </button>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Continue with your Email
        </h2>
        <p className="text-neutral-500 text-xs leading-relaxed">
          Sign up with your email and password. Student accounts are created by
          teachers or admins.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {success && (
          <div className="p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs">
            {success}
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <AuthInputField
          id="signup-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          placeholder="e.g. you@example.com"
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
          placeholder="Create a password"
          Icon={Lock}
          showToggle
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />

        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex w-2.5 h-2.5 rounded-full border flex-shrink-0 items-center justify-center text-[10px] ${
                req.minLength
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-neutral-300"
              }`}
            >
              {req.minLength ? "✓" : ""}
            </span>
            <span
              className={
                req.minLength
                  ? "text-green-600 text-[11px]"
                  : "text-neutral-400 text-[11px]"
              }
            >
              At least 8 characters
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex w-2.5 h-2.5 rounded-full border flex-shrink-0 items-center justify-center text-[10px] ${
                req.hasUpper
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-neutral-300"
              }`}
            >
              {req.hasUpper ? "✓" : ""}
            </span>
            <span
              className={
                req.hasUpper
                  ? "text-green-600 text-[11px]"
                  : "text-neutral-400 text-[11px]"
              }
            >
              At least 1 uppercase letter
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex w-2.5 h-2.5 rounded-full border flex-shrink-0 items-center justify-center text-[10px] ${
                req.hasLower
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-neutral-300"
              }`}
            >
              {req.hasLower ? "✓" : ""}
            </span>
            <span
              className={
                req.hasLower
                  ? "text-green-600 text-[11px]"
                  : "text-neutral-400 text-[11px]"
              }
            >
              At least 1 lowercase letter
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex w-2.5 h-2.5 rounded-full border flex-shrink-0 items-center justify-center text-[10px] ${
                req.hasNumber
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-neutral-300"
              }`}
            >
              {req.hasNumber ? "✓" : ""}
            </span>
            <span
              className={
                req.hasNumber
                  ? "text-green-600 text-[11px]"
                  : "text-neutral-400 text-[11px]"
              }
            >
              At least 1 number
            </span>
          </div>
        </div>

        <AuthInputField
          id="signup-confirm-password"
          label="Confirm Password"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setError("");
          }}
          placeholder="Re-enter your password"
          Icon={Lock}
          showToggle
          showPassword={showConfirmPassword}
          setShowPassword={setShowConfirmPassword}
        />

        <button
          type="submit"
          disabled={isLoading || !allMet || !passwordsMatch}
          className="w-full text-white py-3 text-sm rounded-lg font-semibold bg-primary-500 hover:bg-primary-600 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating account…" : "Continue"}
        </button>
      </form>
      <p className="mt-4 text-center text-neutral-400 text-[11px] leading-relaxed">
        By continuing, you agree to the EduCompose Terms of Service. Please read
        our Privacy Policy.
      </p>
    </>
  );
}
