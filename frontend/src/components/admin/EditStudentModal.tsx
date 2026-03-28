import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Button from "../ui/Button";
import Input from "../ui/Input";

interface Program {
  id: string;
  name: string;
  abbr: string;
  department_id: string;
  departments?: {
    name: string;
    code: string;
    school_id: string;
  };
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student: any;
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({ isOpen, onClose, onSuccess, student }) => {
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
    const fetchPrograms = async () => {
      try {
        setIsLoadingPrograms(true);
        const { data, error } = await supabase
          .from("programs_lookup")
          .select(`
            *,
            departments(
              name,
              code,
              school_id
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

      const normalizedEmail = formData.email.trim().toLowerCase();
      const currentEmail = (student?.email || "").trim().toLowerCase();
      const hasProvisionedAuthAccount = !!student?.auth_user_id;

      // Provisioned students are linked to a Supabase Auth account.
      // Changing email only in students table can desync login/reset flows.
      if (hasProvisionedAuthAccount && normalizedEmail !== currentEmail) {
        setFormError(
          "Email cannot be changed here for provisioned student accounts. Please use account provisioning/reset flow to change login email safely.",
        );
        return;
      }

      // Prevent cross-role conflicts: a student email must not match teacher/admin accounts.
      // Only check when email is changed.
      if (normalizedEmail && normalizedEmail !== currentEmail) {
        const { data: existingUser, error: lookupError } = await supabase
          .from("users")
          .select("id, role, email")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (lookupError) {
          throw lookupError;
        }

        if (existingUser) {
          const existingRole = (existingUser.role || "").toLowerCase();
          if (existingRole !== "student") {
            setFormError(
              `This email is already used by a ${existingRole || "user"} account. Please use a different student email.`,
            );
            return;
          }
          setFormError(
            "This email is already used by another student account. Please use a different email.",
          );
          return;
        }
      }

      const { error } = await supabase
        .from("students")
        .update({
          ...formData,
          email: normalizedEmail,
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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <h2 className="text-xl font-bold text-neutral-900">Edit Student Profile</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form id="edit-student-form" onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Student ID</label>
              <Input
                value={formData.student_code}
                onChange={(val) => setFormData({ ...formData, student_code: val })}
                required
                placeholder="2024-0001"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(val) => setFormData({ ...formData, email: val })}
                required
                placeholder="student@example.com"
                disabled={!!student?.auth_user_id}
              />
              {!!student?.auth_user_id && (
                <p className="mt-1 text-[10px] text-neutral-500">
                  This student is linked to an auth account. Email is locked here to prevent login/reset conflicts.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">First Name</label>
              <Input
                value={formData.first_name}
                onChange={(val) => setFormData({ ...formData, first_name: val })}
                required
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Middle Name</label>
              <Input
                value={formData.middle_name}
                onChange={(val) => setFormData({ ...formData, middle_name: val })}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Last Name</label>
              <Input
                value={formData.last_name}
                onChange={(val) => setFormData({ ...formData, last_name: val })}
                required
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Academic Program</label>
              {isLoadingPrograms ? (
                <div className="flex items-center gap-2 text-xs text-neutral-500 py-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading programs...
                </div>
              ) : (
                <select
                  value={formData.program_id}
                  onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                >
                  <option value="">Select Program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.departments?.code}] {p.name} ({p.abbr})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Year Level</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>{y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Block / Section</label>
                <Input
                  value={formData.block_name}
                  onChange={(val) => setFormData({ ...formData, block_name: val })}
                  placeholder="e.g. 3A"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
            <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Enrollment Status</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, enrollment_status: 'active', is_active: true })}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  formData.enrollment_status === 'active' 
                    ? "bg-green-600 border-green-600 text-white shadow-sm" 
                    : "bg-white border-neutral-200 text-neutral-600 hover:border-green-200"
                }`}
              >
                ACTIVE
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, enrollment_status: 'dropped', is_active: false })}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  formData.enrollment_status === 'dropped' 
                    ? "bg-red-600 border-red-600 text-white shadow-sm" 
                    : "bg-white border-neutral-200 text-neutral-600 hover:border-red-200"
                }`}
              >
                DROPPED
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, enrollment_status: 'graduated', is_active: false })}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  formData.enrollment_status === 'graduated' 
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                    : "bg-white border-neutral-200 text-neutral-600 hover:border-blue-200"
                }`}
              >
                GRADUATED
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 italic mt-1">
              * Only students with "Active" status can log in to the system.
            </p>
          </div>
        </form>

        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="edit-student-form" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditStudentModal;
