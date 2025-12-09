import React, { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  ArrowLeft,
  X,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api";
import { useAuth } from "../contexts/AuthContext";

// --- Form Components ---

// Reusable Input Field component
interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  Icon: React.ElementType;
  showToggle?: boolean;
  showPassword?: boolean;
  setShowPassword?: (show: boolean) => void;
}

const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  Icon,
  showToggle = false,
  showPassword,
  setShowPassword,
}) => (
  <div>
    <label
      htmlFor={id}
      className='block text-sm font-medium text-neutral-600 mb-2'
    >
      {label}
    </label>
    <div className='relative'>
      <Icon className='absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5' />
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        className={`w-full pl-11 ${
          showToggle ? "pr-12" : "pr-4"
        } py-3 border border-neutral-300 rounded-rd bg-white text-neutral-900 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all`}
        placeholder={placeholder}
      />
      {showToggle && setShowPassword && (
        <button
          type='button'
          onClick={() => setShowPassword!(!showPassword)}
          className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-900 hover:text-neutral-400'
        >
          {showPassword ? (
            <EyeOff className='w-5 h-5' />
          ) : (
            <Eye className='w-5 h-5' />
          )}
        </button>
      )}
    </div>
  </div>
);

// --- Form Props (Updated to include onClose) ---
interface FormProps {
  onViewChange: (view: "login" | "signup" | "forgot-password") => void;
  onClose: () => void;
}

// --- Login Form ---
const LoginForm: React.FC<FormProps> = ({ onViewChange, onClose }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Clear previous errors
    setError("");

    // Validate inputs
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    setIsLoading(true);

    // Demo/offline login: bypass backend and create a local session
    const fakeUser = {
      id: Date.now(),
      email: `${username.trim() || "user"}@local.test`,
      username: username.trim() || "user",
      full_name: username.trim() || "User",
      role: "teacher",
      is_active: true,
    };

    login("local-demo-token", fakeUser);
    navigate("/Dashboard");
    onClose();
    setIsLoading(false);
  };

  return (
    <>
      <div className='mb-8'>
        <h2 className='text-3xl font-bold text-neutral-900 mb-2'>
          Welcome Back
        </h2>
        <p className='text-neutral-900'>Login to access your dashboard</p>
      </div>
      <form onSubmit={handleLogin} className='space-y-5'>
        {/* Error Message */}
        {error && (
          <div className='p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm'>
            {error}
          </div>
        )}

        <InputField
          id='login-username'
          label='Username'
          type='text'
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError(""); // Clear error when user types
          }}
          placeholder='Enter your username'
          Icon={User}
        />
        <InputField
          id='login-password'
          label='Password'
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(""); // Clear error when user types
          }}
          placeholder='Enter your password'
          Icon={Lock}
          showToggle
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />

        {/* Remember + Forgot */}
        <div className='flex items-center justify-between text-sm'>
          <label className='flex items-center cursor-pointer'>
            <input
              type='checkbox'
              className='w-4 h-4 text-primary-500 focus:ring-primary-500'
            />
            <span className='ml-2 text-neutral-900'>Remember me</span>
          </label>
          <button
            type='button'
            onClick={() => onViewChange("forgot-password")}
            className='font-semibold text-primary-500 hover:text-primary-600 transition-colors'
          >
            Forgot password?
          </button>
        </div>

        {/* Login Button */}
        <button
          type='submit'
          disabled={isLoading}
          className='w-full text-white py-3 rounded-rd font-semibold bg-primary-500 shadow-lg hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* Sign Up */}
      <p className='text-center text-neutral-900 text-sm mt-6'>
        Don’t have an account?{" "}
        <button
          type='button'
          onClick={() => onViewChange("signup")}
          className='font-semibold text-primary-500 hover:text-primary-600 transition-colors'
        >
          Sign up now!
        </button>
      </p>
    </>
  );
};

// --- Sign Up Form ---
const SignUpForm: React.FC<FormProps> = ({ onViewChange }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Clear previous messages
    setError("");
    setSuccess("");

    // Validate inputs
    if (
      !username.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError("Please fill in all fields");
      return;
    }

    const usernameRegex = /^[a-zA-Z.,]{3,20}$/;
    if (!usernameRegex.test(username.trim())) {
      setError(
        "Username must be 3-20 characters and include only letters, commas, or periods."
      );
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      // Call backend API to register user in PostgreSQL database
      // Backend will auto-generate username and full_name from email
      await authApi.register({
        email: email.trim(),
        password: password,
        username: username.trim(),
      });

      setSuccess(`Account created successfully! Please log in to continue.`);
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      // Wait a moment to show success message, then redirect to login
      setTimeout(() => {
        onViewChange("login");
      }, 2000);
    } catch (err) {
      const apiError = err as { status?: number; message?: string };
      // Handle API errors
      if (
        apiError.status === 0 ||
        apiError.message?.includes("Failed to connect")
      ) {
        setError(
          "Cannot connect to server. Please make sure the backend server is running on http://localhost:8000"
        );
      } else if (apiError.status === 400) {
        setError(
          apiError.message ||
            "Email already registered. Please use a different email."
        );
      } else if (apiError.status === 503) {
        // Show the detailed error message from the backend
        setError(
          apiError.message ||
            "Database connection failed. Please check your database configuration."
        );
      } else {
        setError(apiError.message || "Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => onViewChange("login")}
        className='flex items-center text-neutral-600 mb-4 hover:text-primary-500 transition-colors'
      >
        <ArrowLeft className='w-4 h-4 mr-2' /> Back to Login
      </button>
      <div className='mb-8'>
        <h2 className='text-3xl font-bold text-neutral-900 mb-2'>
          Create Account
        </h2>
        <p className='text-neutral-900'>Join EduCompose today!</p>
      </div>
      <form onSubmit={handleSignUp} className='space-y-5'>
        {/* Success Message */}
        {success && (
          <div className='p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm'>
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className='p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm'>
            {error}
          </div>
        )}

        <InputField
          id='signup-username'
          label='Username'
          type='text'
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError("");
          }}
          placeholder='Choose a unique username'
          Icon={User}
        />
        <InputField
          id='signup-email'
          label='Email Address'
          type='email'
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          placeholder='Enter your email'
          Icon={Mail}
        />
        <InputField
          id='signup-password'
          label='Password'
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder='Create a password (min 6 characters)'
          Icon={Lock}
          showToggle
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />
        <InputField
          id='signup-confirm-password'
          label='Confirm Password'
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setError("");
          }}
          placeholder='Confirm your password'
          Icon={Lock}
          showToggle
          showPassword={showConfirmPassword}
          setShowPassword={setShowConfirmPassword}
        />

        {/* Sign Up Button */}
        <button
          type='submit'
          disabled={isLoading}
          className='w-full text-white py-3 rounded-lg font-semibold bg-primary-500 shadow-lg hover:bg-primary-600 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <UserPlus className='w-5 h-5 mr-2' />{" "}
          {isLoading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>
    </>
  );
};

// --- Forgot Password Form ---
const ForgotPasswordForm: React.FC<FormProps> = ({ onViewChange }) => {
  const [email, setEmail] = useState("");

  const handleSubmit = () => {
    console.log("Requesting password reset for:", email);
    // Add forgot password logic here
    console.log("Password reset link sent to:", email);
    onViewChange("login"); // Redirect back to login after submission
  };

  return (
    <>
      <button
        onClick={() => onViewChange("login")}
        className='flex items-center text-neutral-600 mb-4 hover:text-primary-500 transition-colors'
      >
        <ArrowLeft className='w-4 h-4 mr-2' /> Back to Login
      </button>
      <div className='mb-8'>
        <h2 className='text-3xl font-bold text-neutral-900 mb-2'>
          Forgot Password?
        </h2>
        <p className='text-neutral-900'>
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
      </div>
      <div className='space-y-5'>
        <InputField
          id='forgot-email'
          label='Email Address'
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='Enter your email'
          Icon={Mail}
        />

        {/* Reset Button */}
        <button
          onClick={handleSubmit}
          className='w-full text-white py-3 rounded-rd font-semibold bg-primary-500 shadow-lg hover:bg-primary-600 transition-all'
        >
          Send Reset Link
        </button>
      </div>
    </>
  );
};

// --- Main Modal Component ---
interface AuthModalProps {
  onClose: () => void; // Function to close the modal, passed from the parent component
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [view, setView] = useState<"login" | "signup" | "forgot-password">(
    "login"
  );

  const renderContent = () => {
    const formProps = { onViewChange: setView, onClose };
    switch (view) {
      case "signup":
        return <SignUpForm {...formProps} />;
      case "forgot-password":
        return <ForgotPasswordForm {...formProps} />;
      case "login":
      default:
        return <LoginForm {...formProps} />;
    }
  };

  return (
    // Backdrop: Handles background click and blurs the underlying content
    // backdrop-blur-sm is the key class for the blur effect
    <div
      className='fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-50'
      onClick={(e) => {
        // Close modal if backdrop is clicked, but not the modal content itself
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Container */}
      <div className='relative flex w-full max-w-4xl max-h-[90vh] bg-white rounded-rl shadow-2xl overflow-hidden'>
        {/* Close button inside the modal */}
        <button
          onClick={onClose}
          className='absolute top-4 right-4 p-2 z-20 rounded-full bg-white/80 hover:bg-neutral-100 transition-colors shadow-md'
          aria-label='Close modal'
        >
          <X className='w-5 h-5 text-neutral-600' />
        </button>

        {/* Left Panel - Static Branding */}
        <div className='hidden lg:flex flex-1 items-center justify-center p-10 relative bg-gradient-to-tr from-primary-500 via-primary-400 to-primary-300 text-white'>
          <div className='relative z-10 max-w-xs'>
            <h1 className='text-4xl font-bold mb-4 tracking-tight'>
              Edu<span className='text-primary-50'>Compose</span>
            </h1>
            <p className='text-lg font-semibold mb-6'>
              Teacher's Companion for Essay Evaluation
            </p>
            <ul className='space-y-3'>
              <li className='flex items-start space-x-3'>
                <svg
                  className='w-5 h-5 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                    clipRule='evenodd'
                  />
                </svg>
                <p>AI-powered essay analysis</p>
              </li>
              <li className='flex items-start space-x-3'>
                <svg
                  className='w-5 h-5 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                    clipRule='evenodd'
                  />
                </svg>
                <p>Detailed feedback generation</p>
              </li>
              <li className='flex items-start space-x-3'>
                <svg
                  className='w-5 h-5 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                    clipRule='evenodd'
                  />
                </svg>
                <p>Save time, improve learning</p>
              </li>
            </ul>
          </div>
          {/* Subtle decoration inside the left panel */}
          <div className='absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/3 -translate-y-1/3'></div>
        </div>

        {/* Right Panel - Dynamic Content (FIXED SIZE) */}
        <div className='flex-1 p-8 md:p-10 lg:p-12 overflow-y-auto min-h-[450px] h-full'>
          {/* Mobile Logo/Branding */}
          <div className='lg:hidden text-center mb-8'>
            <h1 className='text-3xl font-bold mb-1 text-neutral-900'>
              Edu<span className='text-primary-500'>Compose</span>
            </h1>
            <p className='text-neutral-600 text-sm'>
              Teacher's Companion for Essay Evaluation
            </p>
          </div>

          {/* Dynamic Form Content */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
