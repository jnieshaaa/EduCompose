import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Mail, UserCircle, CheckCircle, AlertCircle, School, Building2 } from "lucide-react";
import { adminApi } from "../../api";
import { supabase } from "../../lib/supabaseClient";
import Button from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";

interface School {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  school_id: string;
}

interface EditTeacherModalProps {
  teacher: {
    id: string;
    email: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    suffix?: string;
    title?: string;
    nickname?: string;
    school_id?: string;
    department_id?: string;
    role: string;
    is_active: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTeacherModal({
  teacher,
  isOpen,
  onClose,
  onSuccess
}: EditTeacherModalProps) {
  const [firstName, setFirstName] = useState(teacher.first_name || "");
  const [middleName, setMiddleName] = useState(teacher.middle_name || "");
  const [lastName, setLastName] = useState(teacher.last_name || "");
  const [suffix, setSuffix] = useState(teacher.suffix || "");
  const [title, setTitle] = useState(teacher.title || "");
  const [nickname, setNickname] = useState(teacher.nickname || "");
  const [email, setEmail] = useState(teacher.email);
  const [school, setSchool] = useState(teacher.school_id || "");
  const [department, setDepartment] = useState(teacher.department_id || "");
  const [isActive, setIsActive] = useState(teacher.is_active);
  
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: schoolsData } = await supabase.from("schools").select("*").order("name");
      if (schoolsData) setSchools(schoolsData);
      
      if (teacher.school_id) {
        const { data: deptsData } = await supabase.from("departments").select("*").eq("school_id", teacher.school_id).order("name");
        if (deptsData) setDepartments(deptsData);
      }
    };
    fetchInitialData();
  }, [teacher.school_id]);

  useEffect(() => {
    const fetchDepts = async () => {
      if (!school) {
        setDepartments([]);
        return;
      }
      const { data: deptsData } = await supabase.from("departments").select("*").eq("school_id", school).order("name");
      if (deptsData) setDepartments(deptsData);
    };
    fetchDepts();
  }, [school]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    setIsLoading(true);

    try {
      await adminApi.updateUser(teacher.id, {
        email: email.trim(),
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
        suffix: suffix.trim() || undefined,
        title: title || undefined,
        nickname: nickname.trim() || undefined,
        school_id: school || undefined,
        department_id: department || undefined,
        is_active: isActive,
      } as any);

      setSuccess("Profile updated successfully!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Update failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const titleOptions = [
    { value: "Mr.", label: "Mr." },
    { value: "Ms.", label: "Ms." },
    { value: "Mrs.", label: "Mrs." },
    { value: "Sir", label: "Sir" },
    { value: "Prof.", label: "Prof." },
    { value: "Dr.", label: "Dr." },
  ];

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm z-[100]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-neutral-100"
      >
        <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-secondary/10 text-secondary rounded-xl">
              <UserCircle size={18} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 tracking-tight leading-tight">Edit Teacher</h2>
              <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] mt-0.5">Update Teacher</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form id="edit-teacher-form" onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[10px] font-medium uppercase tracking-wider">
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-medium uppercase tracking-wider text-center">
                <CheckCircle size={12} className="inline mr-2" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Prefix</label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 px-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-secondary/5 focus:bg-white focus:border-secondary transition-all outline-none font-medium text-xs text-neutral-700 shadow-sm"
              >
                <option value="">Select Prefix</option>
                {titleOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Nickname"
                className="w-full h-10 px-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-secondary/5 focus:bg-white focus:border-secondary transition-all outline-none font-medium text-xs text-neutral-700 shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">First Name*</label>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-10 px-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-secondary/5 focus:bg-white focus:border-secondary transition-all outline-none font-medium text-xs text-neutral-700 shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Middle Name</label>
              <input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full h-10 px-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-secondary/5 focus:bg-white focus:border-secondary transition-all outline-none font-medium text-xs text-neutral-700 shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Last Name*</label>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-10 px-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-secondary/5 focus:bg-white focus:border-secondary transition-all outline-none font-medium text-xs text-neutral-700 shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Suffix</label>
            <input
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder="e.g., Jr., Sr."
              className="w-full h-10 px-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-secondary/5 focus:bg-white focus:border-secondary transition-all outline-none font-medium text-xs text-neutral-700 shadow-sm"
            />
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">School</label>
              <div className="relative group">
                <School className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-secondary transition-colors" size={14} />
                <select
                  value={school}
                  onChange={(e) => { setSchool(e.target.value); setDepartment(""); }}
                  className="w-full h-10 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-secondary/5 focus:bg-white focus:border-secondary transition-all outline-none font-medium text-xs text-neutral-700 shadow-sm appearance-none"
                >
                  <option value="">Locate School</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Department</label>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-secondary transition-colors" size={14} />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={!school}
                  className="w-full h-10 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-secondary/5 focus:bg-white focus:border-secondary transition-all outline-none font-medium text-xs text-neutral-700 shadow-sm appearance-none disabled:opacity-50"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Email Address*</label>
            <div className="relative group/email">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/email:text-secondary transition-colors" size={14} />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-secondary/5 focus:bg-white focus:border-secondary transition-all outline-none font-medium text-xs text-neutral-700 shadow-sm"
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                isActive 
                  ? "bg-emerald-50/50 border-emerald-100 text-emerald-700" 
                  : "bg-red-50/50 border-red-100 text-red-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isActive ? "bg-emerald-600 shadow-sm" : "bg-red-600 shadow-sm"} text-white`}>
                  {isActive ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-medium uppercase tracking-wider">Account Status</p>
                  <p className="text-[9px] opacity-60 font-medium uppercase tracking-tight">
                    {isActive ? "Currently Active" : "Currently Inactive"}
                  </p>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${isActive ? "bg-emerald-600" : "bg-red-300"}`}>
                <div className={`absolute top-1 bottom-1 w-3 bg-white rounded-full transition-all ${isActive ? "right-1" : "left-1"}`} />
              </div>
            </button>
          </div>
        </form>

        <div className="px-6 py-4 bg-neutral-50 flex justify-end gap-2.5 border-t border-neutral-100">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1 sm:flex-none border-neutral-200 text-neutral-500 h-10 rounded-xl text-[10px] font-medium uppercase tracking-widest">
            Cancel
          </Button>
          <Button 
            type="submit"
            form="edit-teacher-form"
            disabled={isLoading} 
            className="flex-1 sm:flex-none bg-secondary text-white shadow-lg shadow-secondary/20 h-10 px-8 group rounded-xl text-[10px] font-medium uppercase tracking-widest"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
