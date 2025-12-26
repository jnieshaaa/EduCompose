import { Mail, Lock } from "lucide-react";
import { AuthInputField } from "./AuthInputField";

interface LoginFormProps {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  error: string;
  setError: (error: string) => void;
  isLoading: boolean;
  onSubmit: (e?: React.FormEvent) => void;
  onViewChange: (view: "login" | "signup" | "forgot-password") => void;
}

export function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  setError,
  isLoading,
  onSubmit,
  onViewChange,
}: LoginFormProps) {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-neutral-900 mb-2">
          Welcome Back
        </h2>
        <p className="text-neutral-900">Login to access your dashboard</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <AuthInputField
          id="login-email"
          label="Email"
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
          id="login-password"
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder="Enter your password"
          Icon={Lock}
          showToggle
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary-500 focus:ring-primary-500"
            />
            <span className="ml-2 text-neutral-900">Remember me</span>
          </label>
          <button
            type="button"
            onClick={() => onViewChange("forgot-password")}
            className="font-semibold text-primary-500 hover:text-primary-600 transition-colors"
          >
            Forgot password?
          </button>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full text-white py-3 rounded-rd font-semibold bg-primary-500 shadow-lg hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* Sign Up */}
      <p className="text-center text-neutral-900 text-sm mt-6">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={() => onViewChange("signup")}
          className="font-semibold text-primary-500 hover:text-primary-600 transition-colors"
        >
          Sign up now!
        </button>
      </p>
    </>
  );
}

