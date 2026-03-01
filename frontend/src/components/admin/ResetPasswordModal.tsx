import React, { useState } from "react";
import { X } from "lucide-react";
import { adminApi } from "../../api";
import Button from "../ui/Button";
import Input from "../ui/Input";

interface ResetPasswordModalProps {
  user: {
    id: string;
    email: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function ResetPasswordModal({
  user,
  isOpen,
  onClose,
}: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPassword.trim() || newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await adminApi.resetUserPassword(user.id, newPassword.trim());
      setSuccess("Password reset successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to reset password. Please try again.");
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
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 z-20 rounded-full bg-white/80 hover:bg-neutral-100 transition-colors shadow-md"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-neutral-600" />
        </button>

        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Reset Password
        </h2>
        <p className="text-sm text-neutral-600 mb-6">
          Reset password for <strong>{user.email}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              New Password *
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={setNewPassword}
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
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
