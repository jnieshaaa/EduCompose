import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useState } from "react";
import type { ChangeEvent } from "react";

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newStudent: {
    id: string;
    firstName: string;
    middleName: string;
    lastName: string;
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

// Regex to allow: a-z, A-Z, spaces, comma, period, and specific accents.
const NAME_REGEX =
  /^[a-zA-Z\s,.\u00C0-\u00FF\u0152\u0153\u0178ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØŒÙÚÛÜÝÞàáâãäåæçèéêëìíîïðñòóôõöøœùúûüýþÿ]+$/;

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
  const [nameError, setNameError] = useState<string>("");

  // Helper function to validate name field
  const validateNameField = (
    name: string,
    fieldName: string
  ): string | null => {
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

  // Triggered when user clicks "Add Student"
  const handleSave = () => {
    // 1. Validate Name Fields
    const firstNameError = validateNameField(
      newStudent.firstName,
      "First name"
    );
    const lastNameError = validateNameField(newStudent.lastName, "Last name");
    const middleNameError = newStudent.middleName.trim()
      ? validateNameField(newStudent.middleName, "Middle name")
      : null;

    // 2. If any error, set it and stop submission
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

    // 3. If no error, clear error state and submit
    setNameError("");
    onSubmit();
  };

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
              // Accept either a string value or a ChangeEvent from native input
              onChange={(e: ChangeEvent<HTMLInputElement> | string) => {
                const value = typeof e === "string" ? e : e.target?.value ?? "";
                onInputChange("id", value);
              }}
            />
          </div>

          <div>
            <Label htmlFor="student-first-name">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="student-first-name"
              placeholder="e.g., John"
              className={`mt-1 ${
                nameError && nameError.includes("First name")
                  ? "border-red-500 focus:ring-red-500"
                  : ""
              }`}
              value={newStudent.firstName}
              onChange={(value: string) => {
                onInputChange("firstName", value);
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
            <Label htmlFor="student-middle-name">Middle Name</Label>
            <Input
              id="student-middle-name"
              placeholder="e.g., Mark (optional)"
              className={`mt-1 ${
                nameError && nameError.includes("Middle name")
                  ? "border-red-500 focus:ring-red-500"
                  : ""
              }`}
              value={newStudent.middleName}
              onChange={(value: string) => {
                onInputChange("middleName", value);
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
            <Label htmlFor="student-last-name">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="student-last-name"
              placeholder="e.g., Doe"
              className={`mt-1 ${
                nameError && nameError.includes("Last name")
                  ? "border-red-500 focus:ring-red-500"
                  : ""
              }`}
              value={newStudent.lastName}
              onChange={(value: string) => {
                onInputChange("lastName", value);
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
              <p className="text-red-500 text-xs mt-1">{nameError}</p>
            )}
          </div>

          <div>
            <Label htmlFor="student-email">Email</Label>
            <Input
              id="student-email"
              type="email"
              placeholder="student@example.com"
              className="mt-1"
              value={newStudent.email}
              // Accept either a string value or a ChangeEvent from native input
              onChange={(e: ChangeEvent<HTMLInputElement> | string) => {
                const value = typeof e === "string" ? e : e.target?.value ?? "";
                onInputChange("email", value);
              }}
            />
          </div>
          <div>
            <Label htmlFor="student-program">Program</Label>
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
                className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-md"
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
                className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-md"
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
              // We use handleSave here instead of direct onSubmit
              onClick={handleSave}
              // Only disable if currently loading (sending to backend)
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
