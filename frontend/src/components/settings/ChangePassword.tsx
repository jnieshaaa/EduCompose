import React, { useState } from "react";
import { Lock, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { ScrollableSection } from "./ScrollableSection";
import Button from "../ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { useAlert } from "../../hooks/useAlert";

export const ChangePassword: React.FC<{ id: string }> = ({ id }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { showSuccess, showError, AlertComponent } = useAlert();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!currentPassword) newErrors.currentPassword = "Required";
    
    if (!newPassword) {
      newErrors.newPassword = "Required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Minimum 8 characters required";
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = "Must contain an uppercase letter";
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.newPassword = "Must contain a lowercase letter";
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword = "Must contain a number";
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsSaving(true);
    try {
      // 1. Verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        showError("Authentication error. Please log in again.");
        setIsSaving(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setErrors((prev) => ({ ...prev, currentPassword: "Incorrect password" }));
        setIsSaving(false);
        return;
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        showError(updateError.message || "Failed to update password.");
      } else {
        showSuccess("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrors({});
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        showError(err.message || "An unexpected error occurred.");
      } else {
        showError("An unexpected error occurred.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 focus:bg-white transition-all placeholder:text-neutral-300 disabled:opacity-50 font-medium";
  const errorClass = "border-red-500 focus:ring-red-500/15 focus:border-red-500";

  return (
    <ScrollableSection id={id} title="Change Password" icon={Lock}>
      <div className="space-y-4">
        {AlertComponent && <AlertComponent />}
        <div>
          <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block flex items-center justify-between">
            <span>Current Password</span>
            {errors.currentPassword && <span className="text-red-500 text-[10px] normal-case tracking-normal">{errors.currentPassword}</span>}
          </label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              className={`${inputClass} pr-10 ${errors.currentPassword ? errorClass : ""}`}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errors.currentPassword) setErrors({ ...errors, currentPassword: "" });
              }}
              disabled={isSaving}
              placeholder="Enter current password"
            />
            <button
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
              type="button"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block flex items-center justify-between">
            <span>New Password</span>
            {errors.newPassword && <span className="text-red-500 text-[10px] normal-case tracking-normal">{errors.newPassword}</span>}
          </label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              className={`${inputClass} pr-10 ${errors.newPassword ? errorClass : ""}`}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) setErrors({ ...errors, newPassword: "" });
              }}
              disabled={isSaving}
              placeholder="Enter new password"
            />
            <button
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
              type="button"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] font-bold text-neutral-400 mt-2 uppercase tracking-wide">
            Must be at least 8 characters, containing 1 uppercase, 1 lowercase, and 1 number.
          </p>
        </div>

        <div>
           <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block flex items-center justify-between">
            <span>Confirm Password</span>
            {errors.confirmPassword && <span className="text-red-500 text-[10px] normal-case tracking-normal">{errors.confirmPassword}</span>}
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              className={`${inputClass} pr-10 ${errors.confirmPassword ? errorClass : ""}`}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
              }}
              disabled={isSaving}
              placeholder="Re-enter new password"
            />
            <button
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
              type="button"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-neutral-100">
          <Button
            className="bg-primary hover:bg-primary-300 text-white font-bold text-sm h-9 px-4 shadow-md shadow-primary/15"
            onClick={handleSubmit}
            disabled={isSaving || Object.keys(errors).length > 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Change Password
              </>
            )}
          </Button>
        </div>
      </div>
    </ScrollableSection>
  );
};
