import { X } from "lucide-react";
import { useAuthModal } from "../hooks/useAuthModal";
import { AuthModalBranding } from "./auth/AuthModalBranding";
import { LoginForm } from "./auth/LoginForm";
import { SignUpForm } from "./auth/SignUpForm";
import { ForgotPasswordForm } from "./auth/ForgotPasswordForm";

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
    // Signup
    signupFullName,
    setSignupFullName,
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
    // Forgot password
    forgotEmail,
    setForgotEmail,
    handleForgotPassword,
  } = useAuthModal(onClose);

  const renderContent = () => {
    switch (view) {
      case "signup":
        return (
          <SignUpForm
            fullName={signupFullName}
            setFullName={setSignupFullName}
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
            onSubmit={handleForgotPassword}
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
      {/* Modal Container - Fixed height with proper overflow handling */}
      <div className="relative flex w-full max-w-4xl h-[90vh] max-h-[90vh] bg-white rounded-rl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 z-20 rounded-full bg-white/80 hover:bg-neutral-100 transition-colors shadow-md"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-neutral-600" />
        </button>

        {/* Left Panel - Static Branding (Desktop only) */}
        <AuthModalBranding />

        {/* Right Panel - Scrollable Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-8 md:p-10 lg:p-12 flex flex-col justify-center">
            {/* Mobile Logo/Branding */}
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-3xl font-bold mb-1 text-neutral-900">
                Edu<span className="text-primary-500">Compose</span>
              </h1>
              <p className="text-neutral-600 text-sm">
                Teacher's Companion for Essay Evaluation
              </p>
            </div>

            {/* Dynamic Form Content */}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
