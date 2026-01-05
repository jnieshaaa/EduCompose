import { ArrowLeft, Mail, Lock } from "lucide-react";
import { AuthInputField } from "./AuthInputField";
import { CodeInput } from "./CodeInput";

interface ForgotPasswordFormProps {
  email: string;
  setEmail: (value: string) => void;
  step: "email" | "code" | "password";
  verificationCode: string;
  setVerificationCode: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showNewPassword: boolean;
  setShowNewPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  error: string;
  success: string;
  isSendingCode: boolean;
  isVerifyingCode: boolean;
  isResettingPassword: boolean;
  onSendCode: () => void;
  onVerifyCode: () => void;
  onResetPassword: () => void;
  onViewChange: (view: "login" | "signup" | "forgot-password") => void;
}

export function ForgotPasswordForm({
  email,
  setEmail,
  step,
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
  error,
  success,
  isSendingCode,
  isVerifyingCode,
  isResettingPassword,
  onSendCode,
  onVerifyCode,
  onResetPassword,
  onViewChange,
}: ForgotPasswordFormProps) {
  const renderStep = () => {
    switch (step) {
      case "email":
        return (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-neutral-900 mb-2">
                Forgot Password?
              </h2>
              <p className="text-neutral-900">
                Enter your email address and we'll send you a 6-digit code to
                reset your password.
              </p>
            </div>
            <div className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                  {success}
                </div>
              )}
              <AuthInputField
                id="forgot-email"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                Icon={Mail}
              />

              <button
                onClick={onSendCode}
                disabled={isSendingCode}
                className="w-full text-white py-3 rounded-rd font-semibold bg-primary-500 shadow-lg hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingCode ? "Sending Code..." : "Send Verification Code"}
              </button>
            </div>
          </>
        );

      case "code":
        return (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-neutral-900 mb-2">
                Enter Verification Code
              </h2>
              <p className="text-neutral-900">
                We've sent a 6-digit code to <strong>{email}</strong>. Please
                enter it below.
              </p>
            </div>
            <div className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                  {success}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-4 text-center">
                  Enter 6-digit code
                </label>
                <CodeInput
                  value={verificationCode}
                  onChange={setVerificationCode}
                  length={6}
                  error={error}
                />
              </div>

              <button
                onClick={onVerifyCode}
                disabled={isVerifyingCode || verificationCode.length !== 6}
                className="w-full text-white py-3 rounded-rd font-semibold bg-primary-500 shadow-lg hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifyingCode ? "Verifying..." : "Verify Code"}
              </button>

              <button
                onClick={() => {
                  setVerificationCode("");
                  setEmail("");
                  onViewChange("forgot-password");
                }}
                className="w-full text-neutral-600 py-2 text-sm hover:text-primary-500 transition-colors"
              >
                Back to email
              </button>
            </div>
          </>
        );

      case "password":
        return (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-neutral-900 mb-2">
                Reset Password
              </h2>
              <p className="text-neutral-900">
                Enter your new password below.
              </p>
            </div>
            <div className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                  {success}
                </div>
              )}
              <AuthInputField
                id="new-password"
                label="New Password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                Icon={Lock}
                showToggle
                showPassword={showNewPassword}
                setShowPassword={setShowNewPassword}
              />

              <AuthInputField
                id="confirm-password"
                label="Confirm New Password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                Icon={Lock}
                showToggle
                showPassword={showConfirmPassword}
                setShowPassword={setShowConfirmPassword}
              />

              <button
                onClick={onResetPassword}
                disabled={isResettingPassword}
                className="w-full text-white py-3 rounded-rd font-semibold bg-primary-500 shadow-lg hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResettingPassword ? "Resetting Password..." : "Reset Password"}
              </button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <button
        onClick={() => onViewChange("login")}
        className="flex items-center text-neutral-600 mb-4 hover:text-primary-500 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
      </button>
      {renderStep()}
    </>
  );
}
