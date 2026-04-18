import React, { useState } from "react";
import { X, UserPlus, Shield, GraduationCap, Mail, Lock, UserCircle, Briefcase } from "lucide-react";
import { authApi } from "../../api";
import Button from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";

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
  const [title, setTitle] = useState("");
  const [nickname, setNickname] = useState("");
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
        title: title || undefined,
        nickname: nickname.trim() || undefined,
      });

      setSuccess(`Account provisioned successfully for ${role}!`);

      setFirstName("");
      setMiddleName("");
      setLastName("");
      setTitle("");
      setNickname("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        onClose();
        setSuccess("");
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Provisioning failed. Please verify database constraints.");
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
        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-neutral-100"
      >
        {/* Header Branding */}
        <div className="px-8 py-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
              <UserPlus size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-neutral-900 tracking-tight leading-tight">Provision Identity</h2>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-0.5">Administrative Account Creation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form id="provision-user-form" onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Status Messages */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-wider">
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Role Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Assigned Platform Role</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'student', icon: GraduationCap, label: 'Student' },
                { id: 'teacher', icon: Briefcase, label: 'Teacher' },
                { id: 'admin', icon: Shield, label: 'Admin' }
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id as any)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${
                    role === r.id
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-neutral-100 bg-white text-neutral-400 hover:border-neutral-200"
                  }`}
                >
                  <r.icon size={20} />
                  <span className="text-xs font-black uppercase tracking-widest">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Title</label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
              >
                <option value="">None</option>
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Dr.">Dr.</option>
                <option value="Prof.">Prof.</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Platform Nickname</label>
              <div className="relative group">
                <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={16} />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. Antopina"
                  className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
                />
              </div>
            </div>
          </div>

          {/* Name Cluster */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">First Name *</label>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First"
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Middle</label>
              <input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Initial"
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Last Name *</label>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last"
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Official Registry Email *</label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={16} />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@university.edu"
                className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Access Terminal Password *</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={16} />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Verify Password *</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={16} />
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
                />
              </div>
            </div>
          </div>
        </form>

        <div className="px-8 py-6 bg-neutral-50 flex items-center justify-between border-t border-neutral-100">
          <div className="hidden sm:block">
             <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Instant Activation</p>
             <p className="text-[11px] text-neutral-500">Subject to database validation.</p>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-2xl border-neutral-200 px-6"
            >
              Cancel
            </Button>
            <Button 
                type="submit"
                form="provision-user-form"
                disabled={isLoading}
                className="rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 px-8 h-11"
            >
              {isLoading ? "Synchronizing..." : "Provision Now"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
