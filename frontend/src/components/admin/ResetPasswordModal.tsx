import React, { useState } from "react";
import { X, Lock, ShieldCheck, AlertTriangle, Key } from "lucide-react";
import { adminApi } from "../../api";
import Button from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";

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
      setError("Security requirement: Minimum 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
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
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm z-[60]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-neutral-100"
      >
        <div className="px-8 py-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-200">
              <Key size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-tight">Reset Password</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mt-0.5">Update user password</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
             <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
             <div>
                <p className="text-[11px] font-bold text-amber-900 uppercase tracking-widest leading-none mb-1">Account</p>
                <p className="text-xs font-bold text-amber-700 font-mono">{user.email}</p>
             </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <form id="reset-secret-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">New Password</label>
              <div className="relative group/pass">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/pass:text-primary transition-colors" size={16} />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Confirm Password</label>
              <div className="relative group/confirm">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/confirm:text-primary transition-colors" size={16} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 rounded-2xl border-neutral-200 h-11"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                form="reset-secret-form"
                disabled={isLoading}
                className="flex-[2] rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-200 h-11 font-bold uppercase text-[11px] tracking-widest"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
