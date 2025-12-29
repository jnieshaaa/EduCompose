import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useState } from "react";

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

  // Helper function to validate name
  const validateName = (name: string): string | null => {
    if (!name || name.trim().length < 3) {
      return "Name must be at least 3 characters long.";
    }
    if (!NAME_REGEX.test(name)) {
      return "Invalid characters. Only letters, spaces, commas, and periods are allowed.";
    }
    return null;
  };

  // Triggered when user clicks "Add Student"
  const handleSave = () => {
    // 1. Validate Name
    const error = validateName(newStudent.name);

    // 2. If error, set it and stop submission
    if (error) {
      setNameError(error);
      return;
    }

    // 3. If no error, clear error state and submit
    setNameError("");
    onSubmit();
  };

  // Triggered when typing in the name field
  const handleNameChange = (value: string) => {
    onInputChange("name", value);

    // If there was an error previously, check if the new value fixes it
    if (nameError) {
      const error = validateName(value);
      if (!error) {
        setNameError("");
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
        </DialogHeader>
        <div className='space-y-4 mt-4'>
          <div>
            <Label htmlFor='student-id'>Student ID</Label>
            <Input
              id='student-id'
              placeholder='e.g., STU009'
              className='mt-1'
              value={newStudent.id}
              // Added safety check: use e.target.value if it's an event
              onChange={(e: any) =>
                onInputChange("id", e.target ? e.target.value : e)
              }
            />
          </div>

          <div>
            <Label htmlFor='student-name'>Full Name</Label>
            <Input
              id='student-name'
              placeholder='e.g., John Doe'
              // Add red border if error exists
              className={`mt-1 ${
                nameError ? "border-red-500 focus:ring-red-500" : ""
              }`}
              value={newStudent.name}
              // FIX IS HERE: Explicitly extract the value from the event
              onChange={(e: any) => {
                // This handles both standard inputs (Event object) and custom inputs (Direct string)
                const val = e && e.target ? e.target.value : e;
                handleNameChange(val);
              }}
            />
            {/* Show error message if it exists */}
            {nameError && (
              <p className='text-red-500 text-xs mt-1'>{nameError}</p>
            )}
          </div>

          <div>
            <Label htmlFor='student-email'>Email</Label>
            <Input
              id='student-email'
              type='email'
              placeholder='student@example.com'
              className='mt-1'
              value={newStudent.email}
              // Added safety check here too
              onChange={(e: any) =>
                onInputChange("email", e.target ? e.target.value : e)
              }
            />
          </div>
          <div>
            <Label htmlFor='student-program'>Program</Label>
            {urlProgramFilter ? (
              <Input
                id='student-program'
                className='mt-1'
                value={newStudent.program || urlProgramFilter}
                readOnly
              />
            ) : (
              <select
                id='student-program'
                className='w-full mt-1 px-3 py-2 border border-neutral-300 rounded-md'
                value={newStudent.program}
                onChange={(e) => onInputChange("program", e.target.value)}
              >
                <option value='Select Program'>Select Program</option>
                {availablePrograms.map((program) => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <Label htmlFor='student-section'>Section</Label>
            {urlSectionFilter ? (
              <Input
                id='student-section'
                className='mt-1'
                value={newStudent.section || urlSectionFilter}
                readOnly
              />
            ) : (
              <select
                id='student-section'
                className='w-full mt-1 px-3 py-2 border border-neutral-300 rounded-md'
                value={newStudent.section}
                onChange={(e) => onInputChange("section", e.target.value)}
              >
                <option value='Select Section'>Select Section</option>
                {availableSections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className='flex justify-end gap-2 pt-4'>
            <Button variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button
              className='bg-primary hover:bg-primary-300'
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
