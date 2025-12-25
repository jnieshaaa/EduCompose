import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import Input from "../ui/Input";
import Button from "../ui/Button";

interface AddSectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newSection: {
    name: string;
    program: string;
    term: string;
    students: string;
  };
  onInputChange: (field: string, value: string) => void;
  onSubmit: () => void;
  availablePrograms: string[];
  programTracksMap: Map<string, number>;
  sections: Array<{ program: string }>;
  urlProgramFilter: string | null;
  isCreating: boolean;
}

export function AddSectionDialog({
  isOpen,
  onClose,
  newSection,
  onInputChange,
  onSubmit,
  availablePrograms,
  programTracksMap,
  sections,
  urlProgramFilter,
  isCreating,
}: AddSectionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Block</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="section-name">Block Name</Label>
            <Input
              id="section-name"
              placeholder="e.g., Section A"
              className="mt-1"
              value={newSection.name}
              onChange={(value) => onInputChange("name", value)}
            />
          </div>
          <div>
            <Label htmlFor="section-program">Program</Label>
            <select
              id="section-program"
              className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
              value={newSection.program}
              onChange={(e) => onInputChange("program", e.target.value)}
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
            {/* Show tracks limit info */}
            {newSection.program !== "Select Program" &&
              programTracksMap.has(newSection.program) && (
                <div className="mt-1 text-xs text-neutral-500">
                  {(() => {
                    const maxTracks =
                      programTracksMap.get(newSection.program) ?? 0;
                    const existingCount = sections.filter(
                      (s) => s.program === newSection.program
                    ).length;
                    const remaining =
                      maxTracks > 0 ? maxTracks - existingCount : null;

                    if (maxTracks > 0) {
                      if (remaining !== null && remaining > 0) {
                        return (
                          <span className="text-info-default">
                            {existingCount} of {maxTracks} sections created.{" "}
                            {remaining} remaining.
                          </span>
                        );
                      } else if (remaining === 0) {
                        return (
                          <span className="text-error-default">
                            Maximum {maxTracks} section(s) reached for this
                            program.
                          </span>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
              )}
          </div>
          <div>
            <Label htmlFor="section-term">Academic Term</Label>
            <Input
              id="section-term"
              placeholder="e.g., Fall 2025"
              className="mt-1"
              value={newSection.term}
              onChange={(value) => onInputChange("term", value)}
            />
          </div>
          <div>
            <Label htmlFor="section-students">Expected Students</Label>
            <Input
              id="section-students"
              type="number"
              placeholder="0"
              className="mt-1"
              value={newSection.students}
              onChange={(value) => onInputChange("students", value)}
            />
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
              {isCreating ? "Creating..." : "Create Block"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

