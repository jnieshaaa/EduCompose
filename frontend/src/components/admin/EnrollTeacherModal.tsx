import React, { useState, useEffect } from "react";
import { X, Loader2, UserPlus, Mail, Hash, Calendar, BookOpen, Briefcase } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { authApi } from "../../api";
import Button from "../ui/Button";

interface Program {
  id: string;
  name: string;
  abbr: string;
  department_id: string;
  departments?: {
    name: string;
    code: string;
  };
}

interface EnrollTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EnrollTeacherModal: React.FC<EnrollTeacherModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [formError, setFormError] = useState<string>("");
  
  const [formData, setFormData] = useState({
    teacher_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    email: "",
    department_id: "",
    program_id: "",
    year: 1,
    block_name: "",
    birthday: "",
    title: ""
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [deptsRes, progsRes] = await Promise.all([
          supabase.from("departments").select("*").order("name"),
          supabase.from("programs_lookup").select("*").order("name")
        ]);
        
        if (deptsRes.error) throw deptsRes.error;
        if (progsRes.error) throw progsRes.error;

        setDepartments(deptsRes.data || []);
        setPrograms(progsRes.data || []);
      } catch (err) {
        console.error("Error fetching metadata:", err);
      }
    };

    if (isOpen) {
      fetchMetadata();
    }
  }, [isOpen]);

  const filteredPrograms = formData.department_id 
    ? programs.filter(p => p.department_id === formData.department_id)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setFormError("");

      const normalizedEmail = formData.email.trim().toLowerCase();

      // 1. Check for duplicate email in users table
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, email, code")
        .or(`email.eq.${normalizedEmail},code.eq.${formData.teacher_code.trim()}`)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.email === normalizedEmail) {
            setFormError(`Email ${normalizedEmail} is already registered.`);
        } else {
            setFormError(`Teacher Code ${formData.teacher_code} is already assigned.`);
        }
        return;
      }

      // 2. Perform Provisioning using v2 RPC
      const provisionResult = await authApi.provisionUserV2({
        email: normalizedEmail,
        role: "teacher",
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        middle_name: formData.middle_name.trim() || undefined,
        suffix: formData.suffix.trim() || undefined,
        code: formData.teacher_code.trim(),
        birthday: formData.birthday || undefined,
      });

      if (!provisionResult.success) {
          throw new Error("Failed to provision teacher account.");
      }

      // 3. Optional: Assign to department/program if needed
      // (In this schema, teachers ownership of blocks is separate, but we record their primary department in metadata)

      onSuccess();
      onClose();
      // Reset form
      setFormData({
        teacher_code: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        suffix: "",
        email: "",
        department_id: "",
        program_id: "",
        year: 1,
        block_name: "",
        birthday: "",
        title: ""
      });
    } catch (err: any) {
      setFormError(err.message || "Failed to enroll teacher");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-secondary rounded-2xl text-white shadow-lg shadow-secondary/20">
              <Briefcase size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-tight">Enroll Teacher</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mt-0.5">Faculty Academic Record</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form id="enroll-teacher-form" onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {formError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-1">
              {formError}
            </div>
          )}

          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <Hash size={16} className="text-secondary" />
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em]">Identity Details</h3>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Teacher Code*</label>
                  <input
                    required
                    placeholder="T-2024-001"
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-secondary/5 focus:bg-white focus:border-secondary text-sm font-bold transition-all"
                    value={formData.teacher_code}
                    onChange={(e) => setFormData({ ...formData, teacher_code: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Email Address*</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-secondary transition-colors" size={16} />
                    <input
                      required
                      type="email"
                      placeholder="teacher@university.edu"
                      className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-secondary/5 focus:bg-white focus:border-secondary text-sm font-bold transition-all"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">First Name*</label>
                  <input
                    required
                    placeholder="Juan"
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-secondary/5 focus:bg-white focus:border-secondary text-sm font-bold transition-all"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Middle Name</label>
                  <input
                    placeholder="Dela"
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-secondary/5 focus:bg-white focus:border-secondary text-sm font-bold transition-all"
                    value={formData.middle_name}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Last Name*</label>
                  <input
                    required
                    placeholder="Cruz"
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-secondary/5 focus:bg-white focus:border-secondary text-sm font-bold transition-all"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Suffix</label>
                  <select
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-secondary/5 focus:bg-white focus:border-secondary text-sm font-bold transition-all cursor-pointer"
                    value={formData.suffix}
                    onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                  >
                    <option value="">None</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                  </select>
                </div>
             </div>

             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Birthday*</label>
                <div className="relative group">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-secondary transition-colors" size={16} />
                  <input
                    required
                    type="date"
                    className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-secondary/5 focus:bg-white focus:border-secondary text-sm font-bold transition-all cursor-pointer"
                    value={formData.birthday}
                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  />
                </div>
                <p className="text-[9px] text-neutral-400 italic mt-1.5 px-1.5">
                  The initial password will be set to the teacher''s birthday (YYYYMMDD format).
                </p>
             </div>
          </div>

          <div className="p-8 bg-neutral-50/50 rounded-[2.5rem] border border-neutral-100 space-y-6">
             <div className="flex items-center gap-3">
                <BookOpen size={16} className="text-secondary" />
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em]">Institutional Placement</h3>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Department*</label>
                  <select
                    required
                    className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-secondary/5 focus:border-secondary text-sm font-bold transition-all cursor-pointer"
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value, program_id: "" })}
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Program*</label>
                  <select
                    required
                    disabled={!formData.department_id}
                    className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-secondary/5 focus:border-secondary text-sm font-bold transition-all cursor-pointer disabled:opacity-30"
                    value={formData.program_id}
                    onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                  >
                    <option value="">Select Program</option>
                    {filteredPrograms.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
             </div>
          </div>
        </form>

        <div className="px-6 py-5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-4">
          <div className="hidden sm:block">
             <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Portal Credentials</p>
             <p className="text-[10px] text-neutral-500">Teacher can login immediately.</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={loading}
                className="flex-1 sm:flex-none border-neutral-200 text-neutral-500 h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button 
                type="submit" 
                form="enroll-teacher-form" 
                disabled={loading}
                className="flex-1 sm:flex-none bg-secondary text-white shadow-lg shadow-secondary/20 h-10 px-8 group rounded-xl text-[10px] font-bold uppercase tracking-widest"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Enroll Teacher
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrollTeacherModal;
