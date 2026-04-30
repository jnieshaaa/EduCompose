import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, User, Mail, Hash, BookOpen, Layers, CheckCircle, AlertTriangle, GraduationCap, Building2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Button from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";

interface School {
  id: string;
  name: string;
  code: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  school_id: string;
}

interface Program {
  id: string;
  name: string;
  abbr: string;
  department_id: string;
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student: any;
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({ isOpen, onClose, onSuccess, student }) => {
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoadingAcademic, setIsLoadingAcademic] = useState(true);
  const [formError, setFormError] = useState<string>("");
  
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  
  const [formData, setFormData] = useState({
    student_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    program_id: "",
    year: 1,
    block_name: "",
    is_active: true,
    enrollment_status: 'active' as 'active' | 'dropped' | 'graduated'
  });

  useEffect(() => {
    if (student) {
      setFormData({
        student_code: student.student_code || "",
        first_name: student.first_name || "",
        middle_name: student.middle_name || "",
        last_name: student.last_name || "",
        email: student.email || "",
        program_id: student.program_id || "",
        year: student.year || 1,
        block_name: student.block_name || "",
        is_active: student.is_active,
        enrollment_status: student.enrollment_status || 'active'
      });
    }
  }, [student]);

  useEffect(() => {
    const fetchAcademicData = async () => {
      try {
        setIsLoadingAcademic(true);
        const [schoolsRes, deptsRes, progsRes] = await Promise.all([
          supabase.from("schools").select("*").order("name"),
          supabase.from("departments").select("*").order("name"),
          supabase.from("programs_lookup").select("*").order("name")
        ]);
        
        setSchools(schoolsRes.data || []);
        setDepartments(deptsRes.data || []);
        setPrograms(progsRes.data || []);

        // Pre-populate selections if editing
        if (student?.program_id && progsRes.data && deptsRes.data) {
          const prog = progsRes.data.find(p => p.id === student.program_id);
          if (prog) {
            setSelectedDept(prog.department_id);
            const dept = deptsRes.data.find(d => d.id === prog.department_id);
            if (dept) {
              setSelectedSchool(dept.school_id);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching academic data:", err);
      } finally {
        setIsLoadingAcademic(false);
      }
    };

    if (isOpen) {
      fetchAcademicData();
    }
  }, [isOpen, student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setFormError("");

      const normalizedEmail = formData.email.trim().toLowerCase();
      const currentEmail = (student?.email || "").trim().toLowerCase();

      if (normalizedEmail && normalizedEmail !== currentEmail) {
        const { data: existingUser, error: lookupError } = await supabase
          .from("users")
          .select("id, role, email")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (lookupError) throw lookupError;

        if (existingUser) {
          const existingRole = (existingUser.role || "").toLowerCase();
          setFormError(
            existingRole !== "student" 
              ? `This email is already used by a ${existingRole} account.`
              : "This email is already used by another student account."
          );
          return;
        }
      }

      const { error } = await supabase
        .from("users")
        .update({
          student_code: formData.student_code.trim(),
          first_name: formData.first_name.trim(),
          middle_name: formData.middle_name.trim(),
          last_name: formData.last_name.trim(),
          email: normalizedEmail,
          program_id: formData.program_id,
          year: formData.year,
          block_name: formData.block_name,
          is_active: formData.is_active,
          enrollment_status: formData.enrollment_status
        })
        .eq("id", student.id);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err: any) {
      setFormError(err.message || "Failed to update student");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-neutral-100"
      >
        <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
              <User size={22} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 tracking-tight leading-tight">Edit Student</h2>
              <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] mt-0.5">Update Student</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form id="modify-registry-form" onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {formError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className="p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-medium uppercase tracking-wider flex items-center gap-2"
              >
                <AlertTriangle size={14} />
                {formError}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Student ID*</label>
              <div className="relative group/id">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/id:text-primary transition-colors" size={14} />
                <input
                  required
                  value={formData.student_code}
                  onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
                  placeholder="2024-0001"
                  className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Email Address*</label>
              <div className="relative group/mail">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/mail:text-primary transition-colors" size={14} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  disabled={!!student?.id}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">First Name*</label>
              <input
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Middle Name</label>
              <input
                value={formData.middle_name}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Last Name*</label>
              <input
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all"
              />
            </div>
          </div>

          <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* School Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">School</label>
                <div className="relative group/school">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/school:text-primary transition-colors" size={14} />
                  <select
                    value={selectedSchool}
                    onChange={(e) => {
                      setSelectedSchool(e.target.value);
                      setSelectedDept("");
                      setFormData({ ...formData, program_id: "" });
                    }}
                    className="w-full h-11 pl-10 pr-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-medium transition-all appearance-none"
                  >
                    <option value="">Select School</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Department</label>
                <div className="relative group/dept">
                  <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/dept:text-primary transition-colors" size={14} />
                  <select
                    value={selectedDept}
                    disabled={!selectedSchool}
                    onChange={(e) => {
                      setSelectedDept(e.target.value);
                      setFormData({ ...formData, program_id: "" });
                    }}
                    className="w-full h-11 pl-10 pr-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-medium transition-all appearance-none disabled:opacity-50"
                  >
                    <option value="">Select Department</option>
                    {departments
                      .filter(d => d.school_id === selectedSchool)
                      .map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Program Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Program</label>
              {isLoadingAcademic ? (
                <div className="h-11 flex items-center gap-2 text-xs font-medium text-neutral-400 px-4">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  LOADING...
                </div>
              ) : (
                <div className="relative group/select">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/select:text-primary transition-colors shadow-none" size={14} />
                  <select
                    value={formData.program_id}
                    disabled={!selectedDept}
                    onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                    className="w-full h-11 pl-10 pr-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-medium transition-all appearance-none disabled:opacity-50"
                    required
                  >
                    <option value="">Select Program</option>
                    {programs
                      .filter(p => p.department_id === selectedDept)
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Year Level*</label>
                <div className="relative group/year">
                   <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/year:text-primary transition-colors shadow-none" size={14} />
                   <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full h-11 pl-10 pr-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-medium transition-all appearance-none"
                  >
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>{y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Block</label>
                <input
                  value={formData.block_name}
                  onChange={(e) => setFormData({ ...formData, block_name: e.target.value })}
                  placeholder="e.g. 3A"
                  className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-medium transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Status</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'active', label: 'Active', icon: CheckCircle, color: 'emerald' },
                { id: 'dropped', label: 'Dropped', icon: AlertTriangle, color: 'red' },
                { id: 'graduated', label: 'Graduated', icon: GraduationCap, color: 'blue' }
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFormData({ 
                    ...formData, 
                    enrollment_status: s.id as any, 
                    is_active: s.id === 'active' 
                  })}
                  className={`flex items-center justify-center gap-2 h-11 px-2 rounded-xl text-[10px] font-medium uppercase tracking-widest border-2 transition-all ${
                    formData.enrollment_status === s.id
                      ? `bg-${s.color}-600 border-${s.color}-600 text-white shadow-lg shadow-${s.color}-200`
                      : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200"
                  }`}
                >
                  <s.icon size={14} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </form>

        <div className="px-8 py-6 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
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
            form="modify-registry-form"
            disabled={loading}
            className="flex-1 sm:flex-none bg-primary text-white shadow-lg shadow-primary/20 h-10 px-8 group rounded-xl text-[10px] font-medium uppercase tracking-widest"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default EditStudentModal;
