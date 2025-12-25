import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import Input from "../ui/Input";
import Button from "../ui/Button";
import type { Section } from "../../data/sectionsData";

interface EditSectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingSection: Section | null;
  onSectionChange: (section: Section) => void;
  onSubmit: () => void;
  availablePrograms: string[];
  urlProgramFilter: string | null;
}

export function EditSectionDialog({
  isOpen,
  onClose,
  editingSection,
  onSectionChange,
  onSubmit,
  availablePrograms,
  urlProgramFilter,
}: EditSectionDialogProps) {
  if (!editingSection) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Block</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="edit-section-name">Block Name</Label>
            <Input
              id="edit-section-name"
              placeholder="e.g., Section A"
              className="mt-1"
              value={editingSection.name}
              onChange={(value) =>
                onSectionChange({ ...editingSection, name: value })
              }
            />
          </div>
          <div>
            <Label htmlFor="edit-section-program">Program</Label>
            <select
              id="edit-section-program"
              className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
              value={editingSection.program}
              onChange={(e) =>
                onSectionChange({
                  ...editingSection,
                  program: e.target.value,
                })
              }
              disabled={!!urlProgramFilter}
            >
              {urlProgramFilter ? (
                <option key={urlProgramFilter} value={urlProgramFilter}>
                  {urlProgramFilter}
                </option>
              ) : (
                <>
                  <option value="Select Program">Select Program</option>
                  {availablePrograms.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div>
            <Label htmlFor="edit-section-term">Academic Term</Label>
            <Input
              id="edit-section-term"
              placeholder="e.g., Fall 2025"
              className="mt-1"
              value={editingSection.term}
              onChange={(value) =>
                onSectionChange({ ...editingSection, term: value })
              }
            />
          </div>
          <div>
            <Label htmlFor="edit-section-students">Expected Students</Label>
            <Input
              id="edit-section-students"
              type="number"
              placeholder="0"
              className="mt-1"
              value={editingSection.students.toString()}
              onChange={(value) =>
                onSectionChange({
                  ...editingSection,
                  students: parseInt(value) || 0,
                })
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={onSubmit}
            >
              Update Block
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

