import React, { useState, useEffect } from "react";
import { X, Loader2, UserPlus, Mail, Hash, Calendar, BookOpen } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
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

interface EnrollStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EnrollStudentModal: React.FC<EnrollStudentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [formError, setFormError] = useState<string>("");
  
  const [formData, setFormData] = useState({
    student_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    program_id: "",
    year: 1,
    block_name: "",
    birthday: ""
  });

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setIsLoadingPrograms(true);
        const { data, error } = await supabase
          .from("programs_lookup")
          .select(`
            *,
            departments(
              name,
              code
            )
          `)
          .order("name");
        
        if (error) throw error;
        setPrograms(data || []);
      } catch (err) {
        console.error("Error fetching programs:", err);
      } finally {
        setIsLoadingPrograms(false);
      }
    };

    if (isOpen) {
      fetchPrograms();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setFormError("");

      if (!formData.program_id) {
        setFormError("Please select an academic program");
        return;
      }

      const normalizedEmail = formData.email.trim().toLowerCase();

      // Check for duplicate student code or email
      const { data: existing, error: checkError } = await supabase
        .from("students")
        .select("id, student_code, email")
        .or(`student_code.eq.${formData.student_code.trim()},email.eq.${normalizedEmail}`)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        if (existing.student_code === formData.student_code.trim()) {
          setFormError(`Student ID ${formData.student_code} is already registered.`);
        } else {
          setFormError(`Email ${normalizedEmail} is already registered to another student.`);
        }
        return;
      }

      const { error } = await supabase
        .from("students")
        .insert({
          student_code: formData.student_code.trim(),
          first_name: formData.first_name.trim(),
          middle_name: formData.middle_name.trim(),
          last_name: formData.last_name.trim(),
          email: normalizedEmail,
          program_id: formData.program_id,
          year: formData.year,
          block_name: formData.block_name.trim().toUpperCase(),
          birthday: formData.birthday || null,
          enrollment_status: "active",
          is_active: true
        });

      if (error) throw error;
      
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        student_code: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 leading-tight">Enroll New Student</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Add a student to the system</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors p-2 rounded-full hover:bg-neutral-100">
            <X size={20} />
          </button>
        </div>

        <form id="enroll-student-form" onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-1">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] ml-1">Student ID *</label>
              <div className="relative group">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={14} />
                <input
                  required
                  placeholder="2024-0001"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium transition-all"
                  value={formData.student_code}
                  onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] ml-1">Email Address *</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={14} />
                <input
                  required
                  type="email"
                  placeholder="juan.cruz@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] ml-1">First Name*</label>
              <input
                required
                placeholder="Juan"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium transition-all"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] ml-1">Middle</label>
              <input
                placeholder="Middle"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium transition-all"
                value={formData.middle_name}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] ml-1">Last Name*</label>
              <input
                required
                placeholder="Cruz"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium transition-all"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="p-5 bg-neutral-50/50 rounded-[1.5rem] border border-neutral-100 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5">
                <BookOpen size={12} className="text-primary" />
                Program *
              </label>
              {isLoadingPrograms ? (
                <div className="h-11 flex items-center justify-center bg-white border border-neutral-100 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-primary/40" />
                </div>
              ) : (
                <select
                  required
                  value={formData.program_id}
                  onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                  className="w-full px-4 h-11 bg-white border border-neutral-100 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none cursor-pointer group"
                >
                  <option value="">Select a program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.departments?.code || '???'}] {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] ml-1">Year Level</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full px-4 h-11 bg-white border border-neutral-100 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>{y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] ml-1">Class</label>
                <input
                  placeholder="e.g. 1A"
                  className="w-full px-4 h-11 bg-white border border-neutral-100 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all uppercase"
                  value={formData.block_name}
                  onChange={(e) => setFormData({ ...formData, block_name: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] ml-1">Date of Birth</label>
            <div className="relative group">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={14} />
              <input
                type="date"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium transition-all cursor-pointer"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>
            <p className="text-[9px] text-neutral-400 italic mt-1 px-1">
              * Birthday can be used as the initial temporary password for new logins.
            </p>
          </div>
        </form>

        <div className="px-6 py-5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-4">
          <div className="hidden sm:block">
             <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Instant Access</p>
             <p className="text-[10px] text-neutral-500">Student can login immediately.</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={loading}
                className="flex-1 sm:flex-none border-neutral-200 text-neutral-500 h-11"
            >
              Cancel
            </Button>
            <Button 
                type="submit" 
                form="enroll-student-form" 
                disabled={loading}
                className="flex-1 sm:flex-none bg-primary text-white shadow-lg shadow-primary/20 h-11 px-8 group"
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
      </div>
    </div>
  );
};

export default EnrollStudentModal;
