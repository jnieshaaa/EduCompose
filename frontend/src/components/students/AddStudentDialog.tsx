import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import Input from "../ui/Input";
import Button from "../ui/Button";

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newStudent: {
    id: string;
    name: string;
    email: string;
    program: string;
    section: string;
  };
  onInputChange: (field: string, value: string) => void;
  onSubmit: () => void;
  availablePrograms: string[];
  availableSections: string[];
  urlProgramFilter: string | null;
  urlSectionFilter: string | null;
  isCreating: boolean;
}

export function AddStudentDialog({
  isOpen,
  onClose,
  newStudent,
  onInputChange,
  onSubmit,
  availablePrograms,
  availableSections,
  urlProgramFilter,
  urlSectionFilter,
  isCreating,
}: AddStudentDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="student-id">Student ID</Label>
            <Input
              id="student-id"
              placeholder="e.g., STU009"
              className="mt-1"
              value={newStudent.id}
              onChange={(value) => onInputChange("id", value)}
            />
          </div>
          <div>
            <Label htmlFor="student-name">Full Name</Label>
            <Input
              id="student-name"
              placeholder="e.g., John Doe"
              className="mt-1"
              value={newStudent.name}
              onChange={(value) => onInputChange("name", value)}
            />
          </div>
          <div>
            <Label htmlFor="student-email">Email</Label>
            <Input
              id="student-email"
              type="email"
              placeholder="student@example.com"
              className="mt-1"
              value={newStudent.email}
              onChange={(value) => onInputChange("email", value)}
            />
          </div>
          <div>
            <Label htmlFor="student-program">Program</Label>
            {/* Show read-only input when in drill-down mode, otherwise show dropdown */}
            {urlProgramFilter ? (
              <Input
                id="student-program"
                className="mt-1"
                value={newStudent.program || urlProgramFilter}
                readOnly
              />
            ) : (
              <select
                id="student-program"
                className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
                value={newStudent.program}
                onChange={(e) => onInputChange("program", e.target.value)}
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
            <Label htmlFor="student-section">Section</Label>
            {/* Show read-only input when in drill-down mode, otherwise show dropdown */}
            {urlSectionFilter ? (
              <Input
                id="student-section"
                className="mt-1"
                value={newStudent.section || urlSectionFilter}
                readOnly
              />
            ) : (
              <select
                id="student-section"
                className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
                value={newStudent.section}
                onChange={(e) => onInputChange("section", e.target.value)}
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
              disabled={isCreating}
              aria-busy={isCreating}
            >
              {isCreating ? "Adding..." : "Add Student"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

