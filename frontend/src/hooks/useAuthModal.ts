import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAuth,
  DESIGN_MODE_ENABLED,
  DESIGN_MODE_TOKEN,
  DESIGN_MODE_USER,
} from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

// Minimal typed shape for Supabase user metadata
interface UserMetadata {
  full_name?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

export type AuthView = "login" | "signup" | "forgot-password";

export function useAuthModal(onClose: () => void) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [view, setView] = useState<AuthView>("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Signup form state
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] =
    useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState("");

  // Handle login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setLoginError("");

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Please enter both email and password");
      return;
    }

    setIsLoggingIn(true);

    try {
      if (DESIGN_MODE_ENABLED) {
        login(DESIGN_MODE_TOKEN, DESIGN_MODE_USER);
        navigate("/Teacher/Dashboard");
        onClose();
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword.trim(),
      });

      if (error) {
        throw error;
      }

      if (data.session && data.user) {
        const userMeta = (data.user.user_metadata || {}) as UserMetadata;
        const fullName =
          (userMeta.full_name as string | undefined) ||
          (userMeta.name as string | undefined) ||
          data.user.email?.split("@")[0] ||
          "Teacher";

        login(data.session.access_token, {
          id: data.user.id,
          email: data.user.email ?? "",
          username: data.user.email ?? "",
          full_name: fullName,
          role: (userMeta.role as string) || "teacher",
          is_active: true,
          email_verified: !!data.user.email_confirmed_at,
        });

        const role = (userMeta.role as string) || "teacher";
        if (role === "student") {
          navigate("/Student/Dashboard");
        } else {
          navigate("/Teacher/Dashboard");
        }
        onClose();
      } else {
        setLoginError(
          "Authentication failed. Please check your email and password."
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setLoginError(
        message ||
          "Authentication failed. Please check your credentials and try again."
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle signup
  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setSignupError("");
    setSignupSuccess("");

    if (
      !signupFullName.trim() ||
      !signupEmail.trim() ||
      !signupPassword.trim() ||
      !signupConfirmPassword.trim()
    ) {
      setSignupError("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail.trim())) {
      setSignupError("Please enter a valid email address");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Passwords do not match");
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters long");
      return;
    }

    setIsSigningUp(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword.trim(),
        options: {
          data: {
            full_name: signupFullName.trim(),
            role: "teacher",
          },
        },
      });

      if (error) {
        throw error;
      }

      setSignupSuccess(
        "Account created successfully! Please check your email to verify your account, then log in."
      );
      setSignupFullName("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");

      setTimeout(() => {
        setView("login");
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSignupError(message || "Registration failed. Please try again.");
    } finally {
      setIsSigningUp(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    console.log("Requesting password reset for:", forgotEmail);
    // TODO: Implement forgot password logic
    console.log("Password reset link sent to:", forgotEmail);
    setView("login");
  };

  return {
    view,
    setView,
    // Login state
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
    // Signup state
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
    // Forgot password state
    forgotEmail,
    setForgotEmail,
    handleForgotPassword,
  };
}

