import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import Input from "../ui/Input";
import Button from "../ui/Button";
import type { Student, Program, Section } from "../../types/academic";

interface EditStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingStudent: Student | null;
  onStudentChange: (student: Student) => void;
  onSubmit: (studentId: string, updates: Partial<Student>) => void;
  availablePrograms: Program[];
  availableSections: Section[];
  urlProgramFilter: string | null;
  urlSectionFilter: string | null;
}

export function EditStudentDialog({
  isOpen,
  onClose,
  editingStudent,
  onStudentChange,
  onSubmit,
  availablePrograms,
}: EditStudentDialogProps) {
  if (!editingStudent) return null;

  const handleSubmit = () => {
    onSubmit(editingStudent.id, editingStudent);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Student ID / Code</Label>
              <Input
                className="mt-1"
                value={editingStudent.student_code}
                onChange={(val) => onStudentChange({ ...editingStudent, student_code: val })}
              />
            </div>
            <div>
              <Label>First Name</Label>
              <Input
                className="mt-1"
                value={editingStudent.first_name}
                onChange={(val) => onStudentChange({ ...editingStudent, first_name: val })}
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                className="mt-1"
                value={editingStudent.last_name}
                onChange={(val) => onStudentChange({ ...editingStudent, last_name: val })}
              />
            </div>
            <div className="col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                className="mt-1"
                value={editingStudent.email}
                onChange={(val) => onStudentChange({ ...editingStudent, email: val })}
              />
            </div>
            <div>
              <Label>Year level</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                value={editingStudent.year}
                onChange={(e) => onStudentChange({ ...editingStudent, year: parseInt(e.target.value) })}
              >
                {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div>
              <Label>Program</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                value={editingStudent.program_id}
                onChange={(e) => onStudentChange({ ...editingStudent, program_id: e.target.value })}
              >
                {availablePrograms.map(p => <option key={p.id} value={p.id}>{p.abbr}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button className="bg-primary text-white" onClick={handleSubmit}>
              Update Student
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
