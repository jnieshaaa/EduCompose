import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, UserPlus, Mail, Hash, Calendar, BookOpen } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { authApi } from "../../api";
import { sendStudentWelcomeEmail } from "../../services/emailService";
import Button from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { useNotification } from "../../contexts/NotificationContext";

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

interface EnrollStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EnrollStudentModal: React.FC<EnrollStudentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<{ id: string; name: string; code: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string; school_id: string }[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [formError, setFormError] = useState<string>("");
  const { showNotification } = useNotification();
  
  const [formData, setFormData] = useState({
    student_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    email: "",
    school_id: "",
    department_id: "",
    program_id: "",
    year: 1,
    block_name: "",
    birthday: ""
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [schoolsRes, deptsRes, progsRes] = await Promise.all([
          supabase.from("schools").select("*").order("name"),
          supabase.from("departments").select("*").order("name"),
          supabase.from("programs_lookup").select("*").order("name")
        ]);
        
        if (schoolsRes.error) throw schoolsRes.error;
        if (deptsRes.error) throw deptsRes.error;
        if (progsRes.error) throw progsRes.error;

        setSchools(schoolsRes.data || []);
        setDepartments(deptsRes.data || []);
        setPrograms(progsRes.data || []);
      } catch (err) {
        console.error("Error fetching metadata:", err);
      } finally {
        // Metadata fetch finished
      }
    };

    if (isOpen) {
      fetchMetadata();
    }
  }, [isOpen]);

  const filteredDepartments = formData.school_id
    ? departments.filter(d => d.school_id === formData.school_id)
    : [];

  const filteredPrograms = formData.department_id 
    ? programs.filter(p => p.department_id === formData.department_id)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setFormError("");
      
      if (formData.birthday) {
        const birthDate = new Date(formData.birthday);
        const today = new Date();
        
        if (birthDate > today) {
          setFormError("Invalid birthday: Date cannot be in the future");
          setLoading(false);
          return;
        }
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (age < 15) {
          setFormError("Enrollment restricted: Students must be at least 15 years old");
          setLoading(false);
          return;
        }
      }

      if (!formData.program_id) {
        setFormError("Please select an academic program");
        return;
      }

      const normalizedEmail = formData.email.trim().toLowerCase();

      // 1. Check for duplicate student code or email separately
      const { data: existingProfile } = await supabase
        .from("student_profiles")
        .select("student_code")
        .eq("student_code", formData.student_code.trim())
        .maybeSingle();

      if (existingProfile) {
        setFormError(`Student ID ${formData.student_code} is already registered.`);
        return;
      }

      const { data: existingEmail } = await supabase
        .from("users")
        .select("email")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingEmail) {
        setFormError(`Email ${normalizedEmail} is already registered.`);
        return;
      }

      // 2. Perform enrollment using unified atomic provisioner
      const enrollResult = await authApi.provisionUserV2({
        email: normalizedEmail,
        role: "student",
        code: formData.student_code.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        middle_name: formData.middle_name.trim() || undefined,
        suffix: formData.suffix || undefined,
        school_id: formData.school_id,
        department_id: formData.department_id,
        program_id: formData.program_id,
        year: formData.year,
        block_name: formData.block_name,
        birthday: formData.birthday || undefined
      });

      if (!enrollResult.success) {
        throw new Error("Failed to enroll student.");
      }

      // 4. Send welcome email
      if (formData.birthday) {
        try {
          await sendStudentWelcomeEmail({
            to_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
            to_email: normalizedEmail,
            student_code: formData.student_code.trim(),
            temp_password: enrollResult.temp_password || formData.birthday || "",
          });
        } catch (emailErr) {
          console.error("Email failed:", emailErr);
        }
      }

      showNotification('success', "Student successfully enrolled! Welcome email dispatched.");
      
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        student_code: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        suffix: "",
        email: "",
        school_id: "",
        department_id: "",
        program_id: "",
        year: 1,
        block_name: "",
        birthday: ""
      });
    } catch (err: any) {
      setFormError(err.message || "Failed to enroll student");
    } finally {
      setLoading(false);
    }
  };

  return typeof window !== "undefined" ? createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-neutral-100"
          >
        <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
              <UserPlus size={22} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 tracking-tight leading-tight">Enroll Student</h2>
              <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] mt-0.5">Add Student</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form id="enroll-student-form" onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {formError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-medium uppercase tracking-wider overflow-hidden"
              >
                {formError}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <Hash size={16} className="text-primary" />
                <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.3em]">Core Identity</h3>
             </div>
             
             {/* Row 1: Student ID and Birthday */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Student ID*</label>
                  <input
                    required
                    placeholder="000-0000"
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all"
                    value={formData.student_code}
                    onChange={(e) => setFormData({ ...formData, student_code: e.target.value.trimStart() })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Birthday*</label>
                  <div className="relative group">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={16} />
                    <input
                      required
                      type="date"
                      className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all cursor-pointer"
                      value={formData.birthday}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 15)).toISOString().split('T')[0]}
                      onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                    />
                  </div>
                </div>
             </div>

             {/* Row 2: First Name and Middle Name */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">First Name*</label>
                  <input
                    required
                    placeholder="Juan"
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value.trimStart() })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Middle Name</label>
                  <input
                    placeholder="Dela"
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all"
                    value={formData.middle_name}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value.trimStart() })}
                  />
                </div>
             </div>

             {/* Row 3: Last Name and Suffix */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Last Name*</label>
                  <input
                    required
                    placeholder="Cruz"
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value.trimStart() })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Suffix</label>
                  <select
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all cursor-pointer"
                    value={formData.suffix}
                    onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                  >
                    <option value="">None</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                    <option value="V">V</option>
                  </select>
                </div>
             </div>
          </div>

          <div className="p-8 bg-neutral-50/50 rounded-[2.5rem] border border-neutral-100 space-y-6">
             <div className="flex items-center gap-3">
                <BookOpen size={16} className="text-primary" />
                <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.3em]">Placement & Contact</h3>
             </div>

              {/* Row 4: Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Email*</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    required
                    type="email"
                    placeholder="student@university.edu"
                    className="w-full h-11 pl-10 pr-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value.replace(/\s/g, '') })}
                  />
                </div>
              </div>

              {/* Row 5: School */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">School*</label>
                <select
                  required
                  className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all cursor-pointer"
                  value={formData.school_id}
                  onChange={(e) => setFormData({ ...formData, school_id: e.target.value, department_id: "", program_id: "" })}
                >
                  <option value="" disabled>Select School</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>
                  ))}
                </select>
              </div>

              {/* Row 6: Department */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Department*</label>
                <select
                  required
                  disabled={!formData.school_id}
                  className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-medium transition-all cursor-pointer disabled:opacity-30"
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value, program_id: "" })}
                >
                  <option value="" disabled>Select Department</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                  ))}
                </select>
              </div>

              {/* Row 7: Program */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Program*</label>
                <select
                  required
                  disabled={!formData.department_id}
                  className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-medium transition-all cursor-pointer disabled:opacity-30"
                  value={formData.program_id}
                  onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                >
                  <option value="" disabled>Select Program</option>
                  {filteredPrograms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Year level and block in one row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Year Level*</label>
                  <select
                    required
                    className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-medium transition-all cursor-pointer"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>{y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Block (A-G)*</label>
                  <select
                    required
                    className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-medium transition-all cursor-pointer"
                    value={formData.block_name}
                    onChange={(e) => setFormData({ ...formData, block_name: e.target.value })}
                  >
                    <option value="" disabled>Select Block</option>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((b) => (
                      <option key={b} value={b}>Block {b}</option>
                    ))}
                  </select>
                </div>
              </div>
          </div>
        </form>

        <div className="px-6 py-5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-4">
          <div className="hidden sm:block">
             <p className="text-[9px] font-medium text-neutral-400 uppercase tracking-widest">Instant Access</p>
             <p className="text-[10px] text-neutral-500">Student can login immediately.</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={loading}
                className="flex-1 sm:flex-none border-neutral-200 text-neutral-500 h-10 rounded-xl text-[10px] font-medium uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button 
                type="submit" 
                form="enroll-student-form" 
                disabled={loading}
                className="flex-1 sm:flex-none bg-primary text-white shadow-lg shadow-primary/20 h-10 px-8 group rounded-xl text-[10px] font-medium uppercase tracking-widest"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Enroll Student
                </>
              )}
            </Button>
          </div>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  ) : null;
};

export default EnrollStudentModal;
