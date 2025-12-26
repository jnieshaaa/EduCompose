import { ArrowLeft, Mail } from "lucide-react";
import { AuthInputField } from "./AuthInputField";

interface ForgotPasswordFormProps {
  email: string;
  setEmail: (value: string) => void;
  onSubmit: () => void;
  onViewChange: (view: "login" | "signup" | "forgot-password") => void;
}

export function ForgotPasswordForm({
  email,
  setEmail,
  onSubmit,
  onViewChange,
}: ForgotPasswordFormProps) {
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
          Forgot Password?
        </h2>
        <p className="text-neutral-900">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
      </div>
      <div className="space-y-5">
        <AuthInputField
          id="forgot-email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          Icon={Mail}
        />

        {/* Reset Button */}
        <button
          onClick={onSubmit}
          className="w-full text-white py-3 rounded-rd font-semibold bg-primary-500 shadow-lg hover:bg-primary-600 transition-all"
        >
          Send Reset Link
        </button>
      </div>
    </>
  );
}

