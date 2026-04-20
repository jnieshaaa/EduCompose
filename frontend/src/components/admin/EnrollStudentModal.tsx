import React, { useState, useEffect } from "react";
import { X, Loader2, UserPlus, Mail, Hash, Calendar, BookOpen } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { authApi } from "../../api";
import { sendStudentWelcomeEmail } from "../../services/emailService";
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
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [formError, setFormError] = useState<string>("");
  
  const [formData, setFormData] = useState({
    student_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    email: "",
    department_id: "",
    program_id: "",
    year: 1,
    block_name: "",
    birthday: ""
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
      } finally {
        // Metadata fetch finished
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

      if (!formData.program_id) {
        setFormError("Please select an academic program");
        return;
      }

      const normalizedEmail = formData.email.trim().toLowerCase();

      // 1. Check for duplicate student code or email across both tables
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id, student_code, email")
        .or(`student_code.eq.${formData.student_code.trim()},email.eq.${normalizedEmail}`)
        .maybeSingle();

      if (existingStudent) {
        if (existingStudent.student_code.toLowerCase() === formData.student_code.trim().toLowerCase()) {
          setFormError(`Student ID ${formData.student_code} is already registered.`);
        } else {
          setFormError(`Email ${normalizedEmail} is already registered to another student.`);
        }
        return;
      }

      // 2. Check users table for email
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingUser) {
        setFormError(`Email ${normalizedEmail} is already registered as a user account.`);
        return;
      }

      // 3. Perform enrollment using the new RPC v4 if available, otherwise direct insert
      // For this implementation, we proceed with direct table operations as requested
      // and let the backend/auth logic handle the sync.
      
      const { data: studentData, error: insertError } = await supabase
        .from("students")
        .insert({
          student_code: formData.student_code.trim(),
          first_name: formData.first_name.trim(),
          middle_name: formData.middle_name.trim(),
          last_name: formData.last_name.trim(),
          suffix: formData.suffix.trim() || null,
          email: normalizedEmail,
          program_id: formData.program_id,
          year: formData.year,
          block_name: formData.block_name,
          birthday: formData.birthday || null,
          enrollment_status: "active",
          is_active: true
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      
      // 4. Provision Auth account if birthday is present
      if (formData.birthday) {
        try {
           const provisionResult = await authApi.provisionUserV2({
             email: normalizedEmail,
             role: "student",
             first_name: formData.first_name.trim(),
             last_name: formData.last_name.trim(),
             middle_name: formData.middle_name.trim() || undefined,
             suffix: formData.suffix.trim() || undefined,
             code: formData.student_code.trim(),
             birthday: formData.birthday || undefined,
           });

           if (provisionResult.success) {
             // 5. Link the student record to the auth account
             try {
               await supabase.rpc("link_student_auth", {
                 p_student_id: studentData.id,
                 p_auth_user_id: provisionResult.auth_id,
               });
             } catch (linkErr) {
               console.error("Linking failed but account provisioned:", linkErr);
             }

             // Send welcome email with the credentials
             await sendStudentWelcomeEmail({
               to_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
               to_email: normalizedEmail,
               student_code: formData.student_code.trim(),
               temp_password: provisionResult.temp_password,
             });
           }
        } catch (authErr) {
           console.error("Auth provisioning or email failed, but student record created:", authErr);
        }
      }

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
              <UserPlus size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-tight">Enroll Student</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mt-0.5">Academic Record Creation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form id="enroll-student-form" onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {formError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-1">
              {formError}
            </div>
          )}

          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <Hash size={16} className="text-primary" />
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em]">Identity Details</h3>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Student Code*</label>
                  <input
                    required
                    placeholder="2024-0001"
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
                    value={formData.student_code}
                    onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Email Address*</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={16} />
                    <input
                      required
                      type="email"
                      placeholder="student@university.edu"
                      className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
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
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Middle Name</label>
                  <input
                    placeholder="Dela"
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
                    value={formData.middle_name}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Last Name*</label>
                  <input
                    required
                    placeholder="Cruz"
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Suffix</label>
                  <select
                    className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all cursor-pointer"
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
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    required
                    type="date"
                    className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all cursor-pointer"
                    value={formData.birthday}
                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  />
                </div>
                <p className="text-[9px] text-neutral-400 italic mt-1.5 px-1.5">
                  The initial password will be set to the student''s birthday (YYYYMMDD format).
                </p>
             </div>
          </div>

          <div className="p-8 bg-neutral-50/50 rounded-[2.5rem] border border-neutral-100 space-y-6">
             <div className="flex items-center gap-3">
                <BookOpen size={16} className="text-primary" />
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em]">Academic Placement</h3>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Department*</label>
                  <select
                    required
                    className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-bold transition-all cursor-pointer"
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
                    className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-bold transition-all cursor-pointer disabled:opacity-30"
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

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Year Level*</label>
                  <select
                    required
                    className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-bold transition-all cursor-pointer"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>{y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Block (A-G)*</label>
                  <select
                    required
                    className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-bold transition-all cursor-pointer"
                    value={formData.block_name}
                    onChange={(e) => setFormData({ ...formData, block_name: e.target.value })}
                  >
                    <option value="">Select Block</option>
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
             <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Instant Access</p>
             <p className="text-[10px] text-neutral-500">Student can login immediately.</p>
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
                form="enroll-student-form" 
                disabled={loading}
                className="flex-1 sm:flex-none bg-primary text-white shadow-lg shadow-primary/20 h-10 px-8 group rounded-xl text-[10px] font-bold uppercase tracking-widest"
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
