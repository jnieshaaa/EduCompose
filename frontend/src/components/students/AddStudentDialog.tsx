import { useState } from "react";
import { X, UserPlus, Loader2, Mail, Hash, User } from "lucide-react";
import { useStudents } from "../../hooks/useStudents";
import Button from "../../components/ui/Button";

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  blockId: string;
  onSuccess?: () => void;
}

export function AddStudentDialog({
  isOpen,
  onClose,
  blockId,
  onSuccess,
}: AddStudentDialogProps) {
  const { handleCreateStudent } = useStudents(blockId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    student_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.student_code || !formData.first_name || !formData.last_name) {
      alert("Please fill in all required fields.");
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
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Student ID/Code*</label>
              <div className="relative group">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" size={16} />
                <input
                  required
                  placeholder="2024-0001"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                  value={formData.student_code}
                  onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
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
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Email (Optional)</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" size={16} />
                <input
                  type="email"
                  placeholder="juan.cruz@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
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
