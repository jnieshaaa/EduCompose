import React, { useState } from "react";
import { X } from "lucide-react";
import { authApi } from "../../api";
import Button from "../ui/Button";
import Input from "../ui/Input";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: "admin" | "teacher" | "student";
}

export default function CreateUserModal({
  isOpen,
  onClose,
  defaultRole = "teacher",
}: CreateUserModalProps) {
  const [role, setRole] = useState<"admin" | "teacher" | "student">(
    defaultRole,
  );
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password.trim() || password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await authApi.createUser({
        email: email.trim(),
        password: password.trim(),
        role,
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
      });

      setSuccess(`Account created successfully for ${role}!`);

      // Reset form
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess("");
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to create user account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 z-20 rounded-full bg-white/80 hover:bg-neutral-100 transition-colors shadow-md"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-neutral-600" />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">
            Create User Account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                User Role
              </label>
              <div className="flex gap-2">
                {(["admin", "teacher", "student"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                      role === r
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  First Name *
                </label>
                <Input
                  type="text"
                  value={firstName}
                  onChange={setFirstName}
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Middle Name
                </label>
                <Input
                  type="text"
                  value={middleName}
                  onChange={setMiddleName}
                  placeholder="Middle name (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Last Name *
                </label>
                <Input
                  type="text"
                  value={lastName}
                  onChange={setLastName}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Email Address *
              </label>
              <Input
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="user@example.com"
                required
              />
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Password *
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Confirm Password *
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm password"
                  required
                />
              </div>
            </div>

            {/* Error/Success Messages */}
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

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
