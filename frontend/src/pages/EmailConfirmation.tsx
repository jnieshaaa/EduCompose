import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import eduComposeLogo from "../assets/EduCompose.png";

const EmailConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showModal, setShowModal] = useState(true);

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        // Supabase email confirmation URLs typically redirect with tokens in hash fragment
        // Format: #access_token=xxx&refresh_token=xxx&type=signup
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type") || searchParams.get("type");

        // Also check query params for tokens (some configurations use query params)
        const queryToken = searchParams.get("token");
        const queryType = searchParams.get("type");

        if (accessToken && refreshToken) {
          // Set the session using hash-based tokens (most common Supabase flow)
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;
          setStatus("success");
        } else if (queryToken) {
          // Handle query param token (less common but possible)
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: queryToken,
            type: (queryType || type) === "signup" ? "signup" : "email",
          });

          if (error) throw error;
          setStatus("success");
        } else {
          // Check if user is already authenticated (link might have been clicked twice)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setStatus("success");
          } else {
            throw new Error("No confirmation token found in URL. Please check your email for the correct confirmation link.");
          }
        }
      } catch (error: any) {
        console.error("Email confirmation error:", error);
        setStatus("error");
        setErrorMessage(
          error?.message || "Failed to confirm your email. The link may have expired or is invalid."
        );
      }
    };

    handleConfirmation();
  }, [searchParams]);

  const handleClose = () => {
    setShowModal(false);
    // Redirect to home page after a short delay
    setTimeout(() => {
      navigate("/");
    }, 300);
  };

  const handleGoToLogin = () => {
    setShowModal(false);
    navigate("/Login");
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-50 px-6 py-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white rounded-xl p-3 shadow-lg">
              <img
                src={eduComposeLogo}
                alt="EduCompose Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "https://via.placeholder.com/64x64/0791B2/ffffff?text=E";
                }}
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">EduCompose</h1>
          <p className="text-white/90 text-sm mt-1">Teacher's Companion for Essay Evaluation</p>
        </div>

        {/* Body */}
        <div className="px-6 py-8">
          {status === "loading" && (
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Confirming your email...</h2>
              <p className="text-gray-600">Please wait while we verify your email address.</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="w-20 h-20 bg-success-light rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-success-default" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Confirmed!</h2>
              <p className="text-gray-600 mb-6">
                Your email address has been successfully verified. You can now log in to your account.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleGoToLogin}
                  className="flex-1 bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-200 transition-colors shadow-lg"
                >
                  Go to Login
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="w-20 h-20 bg-error-light rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-12 h-12 text-error-default" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmation Failed</h2>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              <div className="flex gap-3">
                <button
                  onClick={handleGoToLogin}
                  className="flex-1 bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-200 transition-colors shadow-lg"
                >
                  Go to Login
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;

