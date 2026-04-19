import React, { useState, useEffect } from "react";
import { X, Briefcase, Mail, UserCircle, Shield, GraduationCap, CheckCircle, AlertCircle } from "lucide-react";
import { adminApi } from "../../api";
import Button from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";

interface EditUserModalProps {
  user: {
    id: string;
    email: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    title?: string;
    nickname?: string;
    role: string;
    is_active: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function EditUserModal({
  user,
  isOpen,
  onClose,
}: EditUserModalProps) {
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [middleName, setMiddleName] = useState(user.middle_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const [title, setTitle] = useState(user.title || "");
  const [nickname, setNickname] = useState(user.nickname || "");
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<"admin" | "teacher" | "student">(
    user.role as "admin" | "teacher" | "student",
  );
  const [isActive, setIsActive] = useState(user.is_active);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setMiddleName(user.middle_name || "");
      setLastName(user.last_name || "");
      setTitle(user.title || "");
      setNickname(user.nickname || "");
      setEmail(user.email);
      setRole(user.role as "admin" | "teacher" | "student");
      setIsActive(user.is_active);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await adminApi.updateUser(user.id, {
        email: email.trim(),
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
        title: title || undefined,
        nickname: nickname.trim() || undefined,
        role,
        is_active: isActive,
      });

      setSuccess("Profile updated successfully!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Update failed. Please check network connectivity.");
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
        <div className="px-8 py-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-neutral-900 rounded-2xl text-white shadow-lg">
              <UserCircle size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-tight">Edit User</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mt-0.5">Update user information</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form id="edit-identity-form" onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
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

          {/* Role Grid */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">User Role</label>
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
                  <span className="text-xs font-bold uppercase tracking-widest">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Title</label>
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
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Platform Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Antopina"
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">First Name</label>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Middle</label>
              <input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Last Name</label>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative group/mail">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/mail:text-primary transition-colors" size={16} />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                isActive 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                  : "bg-red-50 border-red-100 text-red-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isActive ? "bg-emerald-600" : "bg-red-600"} text-white transition-colors`}>
                  {isActive ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold uppercase tracking-widest">Account Status</p>
                  <p className="text-[10px] opacity-70 font-bold uppercase tracking-tighter">
                    Account is currently {isActive ? "active" : "inactive"}
                  </p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-colors ${isActive ? "bg-emerald-600" : "bg-red-300"}`}>
                <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-all ${isActive ? "right-1" : "left-1"}`} />
              </div>
            </button>
          </div>
        </form>

        <div className="px-8 py-6 bg-neutral-50 flex justify-end gap-3 border-t border-neutral-100">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="rounded-xl border-neutral-200 px-6 h-10 text-[10px] font-bold uppercase tracking-widest">
            Cancel
          </Button>
          <Button 
            type="submit"
            form="edit-identity-form"
            disabled={isLoading} 
            className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20 px-8 h-10 text-[10px] font-bold uppercase tracking-widest"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
