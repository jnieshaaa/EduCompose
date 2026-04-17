import { X, CheckCircle } from "lucide-react";
import { useAuthModal } from "../hooks/useAuthModal";
import { AuthModalBranding } from "./auth/AuthModalBranding";
import { LoginForm } from "./auth/LoginForm";
import { SignUpForm } from "./auth/SignUpForm";
import { ForgotPasswordForm } from "./auth/ForgotPasswordForm";
import { CodeInput } from "./auth/CodeInput";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const {
    view,
    setView,
    // Login
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
    // Signup
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
    signupVerificationCode,
    setSignupVerificationCode,
    handleSignupGotIt,
    handleVerifySignupCode,
    handleResendSignupCode,
    isVerifyingSignup,
    isResendingSignupCode,
    resendTimer,
    // Forgot password
    forgotEmail,
    setForgotEmail,
    forgotPasswordStep,
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
    forgotPasswordSuccess,
    isSendingCode,
    isVerifyingCode,
    isResettingPassword,
    handleSendCode,
    handleVerifyCode,
    handleResetPassword,
  } = useAuthModal(onClose);

  const renderContent = () => {
    switch (view) {
      case "signup":
        if (signupStep === "accountCreated") {
          return (
            <div className="flex flex-col items-center justify-center py-6 px-2">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                Account Created
              </h2>
              <p className="text-neutral-500 text-sm text-center mb-6">
                Verification code sent!
              </p>
              <button
                type="button"
                onClick={handleSignupGotIt}
                className="w-full max-w-[200px] py-2.5 text-sm rounded-lg font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-all"
              >
                Got it!
              </button>
            </div>
          );
        }
        if (signupStep === "verifyCode") {
          return (
            <div className="space-y-4">
              <button
                onClick={() => setView("login")}
                className="flex items-center text-neutral-500 text-xs mb-2 hover:text-primary-500 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-neutral-900">
                Enter Verification Code
              </h2>
              <p className="text-neutral-500 text-xs">
                We've sent a 6-digit code to your email. Please enter it below.
              </p>
              {signupSuccess && (
                <div className="p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs">
                  {signupSuccess}
                </div>
              )}
              {signupError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  {signupError}
                </div>
              )}
              <CodeInput
                value={signupVerificationCode}
                onChange={setSignupVerificationCode}
                length={6}
                error={signupError ? undefined : undefined}
              />
              <button
                type="button"
                onClick={handleVerifySignupCode}
                disabled={
                  signupVerificationCode.length !== 6 || isVerifyingSignup
                }
                className="w-full text-white py-2.5 text-sm rounded-lg font-semibold bg-primary-500 hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifyingSignup ? "Verifying…" : "Verify"}
              </button>
              <p className="text-center text-neutral-500 text-xs">
                Didn't get the code?{" "}
                <button
                  type="button"
                  onClick={handleResendSignupCode}
                  disabled={isResendingSignupCode || resendTimer > 0}
                  className="text-primary-500 font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                </button>
              </p>
            </div>
          );
        }
        return (
          <SignUpForm
            email={signupEmail}
            setEmail={setSignupEmail}
            password={signupPassword}
            setPassword={setSignupPassword}
            confirmPassword={signupConfirmPassword}
            setConfirmPassword={setSignupConfirmPassword}
            showPassword={showSignupPassword}
            setShowPassword={setShowSignupPassword}
            showConfirmPassword={showSignupConfirmPassword}
            setShowConfirmPassword={setShowSignupConfirmPassword}
            error={signupError}
            setError={setSignupError}
            success={signupSuccess}
            isLoading={isSigningUp}
            onSubmit={handleSignUp}
            onViewChange={setView}
          />
        );
      case "forgot-password":
        return (
          <ForgotPasswordForm
            email={forgotEmail}
            setEmail={setForgotEmail}
            step={forgotPasswordStep}
            verificationCode={verificationCode}
            setVerificationCode={setVerificationCode}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            error={forgotPasswordError}
            success={forgotPasswordSuccess}
            isSendingCode={isSendingCode}
            isVerifyingCode={isVerifyingCode}
            isResettingPassword={isResettingPassword}
            onSendCode={handleSendCode}
            onVerifyCode={handleVerifyCode}
            onResetPassword={handleResetPassword}
            onViewChange={setView}
          />
        );
      case "login":
      default:
        return (
          <LoginForm
            email={loginEmail}
            setEmail={setLoginEmail}
            password={loginPassword}
            setPassword={setLoginPassword}
            showPassword={showLoginPassword}
            setShowPassword={setShowLoginPassword}
            error={loginError}
            setError={setLoginError}
            isLoading={isLoggingIn}
            onSubmit={handleLogin}
            onViewChange={setView}
            rememberMe={loginRememberMe}
            setRememberMe={setLoginRememberMe}
          />
        );
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Container - Fixed size, equal columns */}
      <div className="relative flex w-full max-w-3xl h-[580px] max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 z-20 rounded-full bg-white/80 hover:bg-neutral-100 transition-colors shadow-md"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-neutral-600" />
        </button>

        {/* Left Panel - Equal 50% */}
        <AuthModalBranding />

        {/* Right Panel - Equal 50%, fixed height, scroll if needed */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center min-h-0">
            {/* Mobile Logo/Branding */}
            <div className="lg:hidden text-center mb-6">
              <h1 className="text-2xl font-bold mb-1 text-neutral-900">
                Edu<span className="text-primary-500">Compose</span>
              </h1>
              <p className="text-neutral-500 text-sm">
                Teacher's Companion for Essay Evaluation
              </p>
            </div>

            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
