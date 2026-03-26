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
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
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
  rememberMe,
  setRememberMe,
}: LoginFormProps) {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Welcome Back
        </h2>
        <p className="text-neutral-600 text-sm">
          Login to access your dashboard
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
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

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 text-primary-500 focus:ring-primary-500 rounded cursor-pointer"
            />
            <span className="ml-1.5 text-neutral-600">Remember me</span>
          </label>
          <button
            type="button"
            onClick={() => onViewChange("forgot-password")}
            className="font-medium text-primary-500 hover:text-primary-600 transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full text-white py-3 text-sm rounded-lg font-semibold bg-primary-500 hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="text-center text-neutral-500 text-xs mt-4">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={() => onViewChange("signup")}
          className="font-medium text-primary-500 hover:text-primary-600 transition-colors"
        >
          Sign up now!
        </button>
      </p>
    </>
  );
}
