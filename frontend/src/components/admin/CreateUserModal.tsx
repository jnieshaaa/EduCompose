import React, { useState } from "react";
import { X, UserPlus, Mail, Lock } from "lucide-react";
import { authApi } from "../../api";
import { supabase } from "../../lib/supabaseClient";
import { sendUserWelcomeEmail } from "../../services/emailService";
import Button from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultRole?: "admin" | "teacher" | "student";
  restrictedRole?: "admin" | "teacher" | "student";
}

export default function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
  defaultRole = "teacher",
  restrictedRole,
}: CreateUserModalProps) {
  const role = restrictedRole || defaultRole;
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthday, setBirthday] = useState("");
  const [code, setCode] = useState("");
  const [suffix, setSuffix] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  
  const [schools, setSchools] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    const fetchLookups = async () => {
      const [schoolsRes, deptsRes] = await Promise.all([
        supabase.from('schools').select('id, name').order('name'),
        supabase.from('departments').select('id, name').order('name')
      ]);
      if (schoolsRes.data) setSchools(schoolsRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
    };
    if (isOpen) fetchLookups();
  }, [isOpen]);

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
      const provisionResult = await authApi.provisionUserV2({
        email: email.trim(),
        password: password.trim(),
        role: (restrictedRole || role) as "admin" | "teacher" | "student",
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
        birthday: birthday || undefined,
        code: code.trim() || undefined,
        suffix: suffix || undefined,
        school_id: schoolId || undefined,
        department_id: departmentId || undefined,
      } as any);

      if (provisionResult.success) {
        // Send welcome email for all users (Admin, Teacher, Student)
        try {
          await sendUserWelcomeEmail({
            to_name: `${firstName.trim()} ${lastName.trim()}`,
            to_email: email.trim(),
            role: provisionResult.role || (restrictedRole || role),
            temp_password: password.trim(),
          });
        } catch (emailErr) {
          console.error("Failed to send welcome email:", emailErr);
        }
      }

      setSuccess(`Account created successfully for ${role}! A confirmation email has been sent.`);

      setFirstName("");
      setMiddleName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setBirthday("");
      setCode("");
      setSuffix("");
      setSchoolId("");
      setDepartmentId("");

      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
        setSuccess("");
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm z-[60]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100"
      >
        {/* Header Branding */}
        <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-primary rounded-xl text-white shadow-md shadow-primary/20">
              <UserPlus size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                {restrictedRole === 'admin' ? 'Create Administrator' : 'Create Account'}
              </h2>
              <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest mt-0.5">
                {restrictedRole === 'admin' ? 'Strategic platform management' : 'Create a new user account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
 
        <form id="provision-user-form" onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
          {/* Status Messages */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, scale: 1 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, scale: 1 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Institutional (Optional) */}
          <div className="grid grid-cols-1 gap-4 bg-neutral-50/50 p-4 rounded-2xl border border-neutral-100">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Assign School</label>
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="w-full h-10 px-4 bg-white border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-xs font-semibold transition-all appearance-none cursor-pointer"
              >
                <option value="">No School Associated</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Assign Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full h-10 px-4 bg-white border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-xs font-semibold transition-all appearance-none cursor-pointer"
              >
                <option value="">No Department Associated</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-5">
            <h3 className="text-[9px] font-bold text-primary uppercase tracking-widest pl-1 border-l-2 border-primary">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">First Name</label>
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="EX: JOHN"
                  className="w-full h-10 px-4 bg-neutral-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-primary text-xs font-semibold transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Middle Name</label>
                <input
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="OPTIONAL"
                  className="w-full h-10 px-4 bg-neutral-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-primary text-xs font-semibold transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Last Name</label>
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="EX: DOE"
                  className="w-full h-10 px-4 bg-neutral-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-primary text-xs font-semibold transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Suffix</label>
                <select
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="w-full h-10 px-4 bg-neutral-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-primary text-xs font-semibold transition-all"
                >
                  <option value="">NONE</option>
                  <option value="JR.">JR.</option>
                  <option value="SR.">SR.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Birthday</label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full h-10 px-4 bg-neutral-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-primary text-xs font-semibold transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">ID / Code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="EX: ADM-001"
                  className="w-full h-10 px-4 bg-neutral-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-primary text-xs font-semibold transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <h3 className="text-[9px] font-bold text-primary uppercase tracking-widest pl-1 border-l-2 border-primary">Security</h3>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={14} />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin.email@university.edu"
                  className="w-full h-10 pl-10 pr-4 bg-neutral-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-primary text-xs font-semibold transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={14} />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 pl-10 pr-4 bg-neutral-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-primary text-xs font-semibold transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={14} />
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 pl-10 pr-4 bg-neutral-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-primary text-xs font-semibold transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
 
        <div className="px-6 py-4 bg-neutral-50 flex items-center justify-between border-t border-neutral-100">
          <div className="hidden sm:block">
             <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Instant Access</p>
             <p className="text-[10px] text-neutral-500">Available immediately.</p>
          </div>
          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl border-neutral-200 px-5 h-9 text-[9px] font-bold uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button 
                type="submit"
                form="provision-user-form"
                disabled={isLoading}
                className="rounded-xl bg-primary text-white shadow-md shadow-primary/20 px-6 h-9 text-[9px] font-bold uppercase tracking-widest"
            >
              {isLoading ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
