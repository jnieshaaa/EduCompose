import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import Input from "../ui/Input";
import Button from "../ui/Button";
import type { Student } from "../../data/studentsData";

interface EditStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingStudent: Student | null;
  onStudentChange: (student: Student) => void;
  onSubmit: () => void;
  availablePrograms: string[];
  availableSections: string[];
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
  availableSections,
  urlProgramFilter,
  urlSectionFilter,
}: EditStudentDialogProps) {
  if (!editingStudent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="edit-student-id">Student ID</Label>
            <Input
              id="edit-student-id"
              placeholder="e.g., STU009"
              className="mt-1"
              value={editingStudent.id}
              onChange={(value) =>
                onStudentChange({ ...editingStudent, id: value })
              }
            />
          </div>
          <div>
            <Label htmlFor="edit-student-name">Full Name</Label>
            <Input
              id="edit-student-name"
              placeholder="e.g., John Doe"
              className="mt-1"
              value={editingStudent.name}
              onChange={(value) =>
                onStudentChange({ ...editingStudent, name: value })
              }
            />
          </div>
          <div>
            <Label htmlFor="edit-student-email">Email</Label>
            <Input
              id="edit-student-email"
              type="email"
              placeholder="student@example.com"
              className="mt-1"
              value={editingStudent.email}
              onChange={(value) =>
                onStudentChange({ ...editingStudent, email: value })
              }
            />
          </div>
          <div>
            <Label htmlFor="edit-student-program">Program</Label>
            {urlProgramFilter ? (
              <Input
                id="edit-student-program"
                className="mt-1"
                value={editingStudent.program}
                readOnly
              />
            ) : (
              <select
                id="edit-student-program"
                className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
                value={editingStudent.program}
                onChange={(e) =>
                  onStudentChange({
                    ...editingStudent,
                    program: e.target.value,
                  })
                }
              >
                <option value="Select Program">Select Program</option>
                {availablePrograms.map((program) => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <Label htmlFor="edit-student-section">Section</Label>
            {urlSectionFilter ? (
              <Input
                id="edit-student-section"
                className="mt-1"
                value={editingStudent.section}
                readOnly
              />
            ) : (
              <select
                id="edit-student-section"
                className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
                value={editingStudent.section}
                onChange={(e) =>
                  onStudentChange({
                    ...editingStudent,
                    section: e.target.value,
                  })
                }
              >
                <option value="Select Section">Select Section</option>
                {availableSections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={onSubmit}
            >
              Update Student
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

