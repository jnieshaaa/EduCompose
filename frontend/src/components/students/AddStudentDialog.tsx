import { useState } from "react";
import { X, UserPlus, Loader2, Mail, Hash, User, Calendar } from "lucide-react";
import { useStudents } from "../../hooks/useStudents";
import Button from "../../components/ui/Button";

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  blockId: string;
  onSuccess?: () => void;
  availablePrograms?: any[];
}

export function AddStudentDialog({
  isOpen,
  onClose,
  blockId,
  onSuccess,
  availablePrograms = [],
}: AddStudentDialogProps) {
  const { handleCreateStudent } = useStudents(blockId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    student_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    birthday: "",
    program_id: "",
    year: 1,
    block_name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const studentCodeRegex = /^\d{3}-\d{4}$/;
    if (!studentCodeRegex.test(formData.student_code)) {
      setError("Student ID must be in XXX-XXXX format (e.g., 123-4567).");
      return;
    }

    if (!formData.student_code || !formData.first_name || !formData.last_name || !formData.email || !formData.birthday) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await handleCreateStudent(formData);
      setFormData({
        student_code: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        birthday: "",
        program_id: "",
        year: 1,
        block_name: "",
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      // console.error(err);
      setError(err.message || "An error occurred while creating the student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Add New Student</h2>
              <p className="text-xs text-neutral-500">Register a new student to this block.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-400">
            <X size={20} />
          </button>
        </div>


        <form onSubmit={handleSubmit} className="p-6 space-y-4 relative">
          {/* Error Overlay (Centered within form) */}
          {error && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="bg-white border border-neutral-200 shadow-2xl rounded-2xl p-6 text-center space-y-4 max-w-[280px] scale-in-center">
                <div className="mx-auto w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                  <X size={24} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Duplicate Found</h3>
                  <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                    {error}
                  </p>
                </div>
                <Button 
                  type="button" 
                  onClick={() => setError(null)} 
                  className="w-full bg-primary text-white hover:bg-primary-600 shadow-md h-10 text-xs"
                >
                  Go Back & Fix
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Student ID/Code*</label>
              <div className="relative group">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" size={16} />
                <input
                  required
                  placeholder="123-4567"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all font-mono"
                  value={formData.student_code}
                  maxLength={8}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^0-9]/g, "");
                    if (value.length > 3) {
                      value = value.slice(0, 3) + "-" + value.slice(3, 7);
                    }
                    setFormData({ ...formData, student_code: value });
                  }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">First Name*</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" size={16} />
                <input
                  required
                  placeholder="Juan"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Middle Name</label>
              <input
                placeholder="Dela"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                value={formData.middle_name}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Last Name*</label>
              <input
                required
                placeholder="Cruz"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Email*</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" size={16} />
                <input
                  required
                  type="email"
                  placeholder="juan.cruz@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Birthday*</label>
              <div className="relative group">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" size={16} />
                <input
                  required
                  type="date"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                />
              </div>
            </div>

            {!blockId && (
              <>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Program*</label>
                  <select
                    required
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                    value={formData.program_id}
                    onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                  >
                    <option value="">Select Program</option>
                    {availablePrograms.map((p) => (
                      <option key={p.id} value={p.id}>{p.abbr} - {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Year Level*</label>
                  <select
                    required
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Block Name*</label>
                  <input
                    required
                    placeholder="e.g. A"
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all uppercase"
                    value={formData.block_name}
                    onChange={(e) => setFormData({ ...formData, block_name: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="ghost">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary text-white px-8">
              {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Register Student
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
