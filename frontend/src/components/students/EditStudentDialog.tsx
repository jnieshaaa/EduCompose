import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import Input from "../ui/Input";
import Button from "../ui/Button";
import type { Student } from "../../data/studentsData";
import { useState, useEffect } from "react";

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

// Helper function to parse full name into first, middle, last
const parseName = (
  fullName: string
): {
  firstName: string;
  middleName: string;
  lastName: string;
} => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: "", lastName: parts[0] };
  } else if (parts.length === 2) {
    return { firstName: parts[0], middleName: "", lastName: parts[1] };
  } else {
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(" "),
      lastName: parts[parts.length - 1],
    };
  }
};

// Regex to allow: a-z, A-Z, spaces, comma, period, and specific accents.
const NAME_REGEX =
  /^[a-zA-Z\s,.\u00C0-\u00FF\u0152\u0153\u0178ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØŒÙÚÛÜÝÞàáâãäåæçèéêëìíîïðñòóôõöøœùúûüýþÿ]+$/;

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
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameError, setNameError] = useState<string>("");

  // Parse the student's name when dialog opens or student changes
  useEffect(() => {
    if (editingStudent) {
      const parsed = parseName(editingStudent.name);
      setFirstName(parsed.firstName);
      setMiddleName(parsed.middleName);
      setLastName(parsed.lastName);
      setNameError("");
    }
  }, [editingStudent]);

  // Helper function to validate name field
  const validateNameField = (name: string, fieldName: string): string | null => {
    if (!name || name.trim().length === 0) {
      return `${fieldName} is required.`;
    }
    if (name.trim().length < 2) {
      return `${fieldName} must be at least 2 characters long.`;
    }
    if (!NAME_REGEX.test(name)) {
      return `Invalid characters in ${fieldName}. Only letters, spaces, commas, and periods are allowed.`;
    }
    return null;
  };

  // Update the student's name when fields change
  const updateStudentName = (fn: string, mn: string, ln: string) => {
    if (!editingStudent) return;
    const fullName = [fn.trim(), mn.trim(), ln.trim()]
      .filter((part) => part.length > 0)
      .join(" ");
    onStudentChange({ ...editingStudent, name: fullName });
  };

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
            <Label htmlFor="edit-student-first-name">First Name <span className='text-red-500'>*</span></Label>
            <Input
              id="edit-student-first-name"
              placeholder="e.g., John"
              className={`mt-1 ${
                nameError && nameError.includes("First name") ? "border-red-500 focus:ring-red-500" : ""
              }`}
              value={firstName}
              onChange={(value) => {
                setFirstName(value);
                updateStudentName(value, middleName, lastName);
                if (nameError && nameError.includes("First name")) {
                  const error = validateNameField(value, "First name");
                  if (!error) {
                    setNameError("");
                  }
                }
              }}
            />
          </div>

          <div>
            <Label htmlFor="edit-student-middle-name">Middle Name</Label>
            <Input
              id="edit-student-middle-name"
              placeholder="e.g., Mark (optional)"
              className={`mt-1 ${
                nameError && nameError.includes("Middle name") ? "border-red-500 focus:ring-red-500" : ""
              }`}
              value={middleName}
              onChange={(value) => {
                setMiddleName(value);
                updateStudentName(firstName, value, lastName);
                if (nameError && nameError.includes("Middle name")) {
                  const error = validateNameField(value, "Middle name");
                  if (!error) {
                    setNameError("");
                  }
                }
              }}
            />
          </div>

          <div>
            <Label htmlFor="edit-student-last-name">Last Name <span className='text-red-500'>*</span></Label>
            <Input
              id="edit-student-last-name"
              placeholder="e.g., Doe"
              className={`mt-1 ${
                nameError && nameError.includes("Last name") ? "border-red-500 focus:ring-red-500" : ""
              }`}
              value={lastName}
              onChange={(value) => {
                setLastName(value);
                updateStudentName(firstName, middleName, value);
                if (nameError && nameError.includes("Last name")) {
                  const error = validateNameField(value, "Last name");
                  if (!error) {
                    setNameError("");
                  }
                }
              }}
            />
            {/* Show error message if it exists */}
            {nameError && (
              <p className='text-red-500 text-xs mt-1'>{nameError}</p>
            )}
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
              onClick={() => {
                // Validate before submitting
                const firstNameError = validateNameField(firstName, "First name");
                const lastNameError = validateNameField(lastName, "Last name");
                const middleNameError = middleName.trim() 
                  ? validateNameField(middleName, "Middle name")
                  : null;

                if (firstNameError) {
                  setNameError(firstNameError);
                  return;
                }
                if (lastNameError) {
                  setNameError(lastNameError);
                  return;
                }
                if (middleNameError) {
                  setNameError(middleNameError);
                  return;
                }

                setNameError("");
                onSubmit();
              }}
            >
              Update Student
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

