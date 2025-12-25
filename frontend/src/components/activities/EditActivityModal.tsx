import { useState, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import type { NewActivityForm } from "../../types/activityTypes";
import { ProgramSelectionModal } from "./ProgramSelectionModal";
import { SectionSelectionModal } from "./SectionSelectionModal";

interface EditActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (activity: NewActivityForm) => Promise<void>;
  initialData: NewActivityForm;
  programs: { id: string; name: string }[];
  sections: { id: string; name: string; programId: string }[];
  rubrics: {
    platform: { id: string; name: string }[];
    teacher: { id: string; name: string }[];
  };
  isSubmitting: boolean;
}

export function EditActivityModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  programs,
  sections,
  rubrics,
  isSubmitting,
}: Omit<EditActivityModalProps, "sectionsBySelectedPrograms">) {
  const [formData, setFormData] = useState<NewActivityForm>(initialData);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
    }
  }, [isOpen, initialData]);

  const handleClose = () => {
    setIsProgramModalOpen(false);
    setIsSectionModalOpen(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    await onSubmit(formData);
    handleClose();
  };

  const handleProgramChange = (programIds: string[]) => {
    setFormData((prev) => {
      const newSectionIds =
        programIds.length === 0
          ? []
          : prev.sectionIds.filter((sectionId) => {
              const section = sections.find((s) => s.id === sectionId);
              return section && programIds.includes(section.programId);
            });
      return { ...prev, programIds, sectionIds: newSectionIds };
    });
  };

  // Compute sections by selected programs dynamically
  const currentSectionsByPrograms = useMemo(() => {
    if (formData.programIds.length === 0) {
      return programs.map((program) => ({
        program,
        sections: sections.filter((s) => s.programId === program.id),
      }));
    }
    return programs
      .filter((p) => formData.programIds.includes(p.id))
      .map((program) => ({
        program,
        sections: sections.filter((s) => s.programId === program.id),
      }));
  }, [formData.programIds, programs, sections]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Edit Essay Activity"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Essay Title"
            placeholder="e.g., Argumentative Essay on Climate Change"
            value={formData.title}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, title: value }))
            }
            required
          />

          {/* Programs Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Programs
            </label>
            <Button
              variant="outline"
              onClick={() => setIsProgramModalOpen(true)}
              className="w-full justify-between"
            >
              <span className="text-sm">
                {formData.programIds.length === 0
                  ? "All Programs"
                  : formData.programIds.length === 1
                  ? programs.find((p) => p.id === formData.programIds[0])
                      ?.name || "Selected"
                  : `${formData.programIds.length} Programs Selected`}
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>

          {/* Sections Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Sections / Blocks
            </label>
            <Button
              variant="outline"
              onClick={() => setIsSectionModalOpen(true)}
              className="w-full justify-between"
              disabled={
                formData.programIds.length === 0 && programs.length === 0
              }
            >
              <span className="text-sm">
                {formData.sectionIds.length === 0
                  ? "All Sections"
                  : formData.sectionIds.length === 1
                  ? sections.find((s) => s.id === formData.sectionIds[0])
                      ?.name || "Selected"
                  : `${formData.sectionIds.length} Sections Selected`}
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>

          {/* Rubric Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Rubric (optional)
            </label>
            <div className="border border-neutral-300 rounded-lg p-3 max-h-60 overflow-y-auto">
              <label className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded cursor-pointer mb-2">
                <input
                  type="radio"
                  name="editRubric"
                  checked={formData.rubricId === ""}
                  onChange={() =>
                    setFormData((prev) => ({ ...prev, rubricId: "" }))
                  }
                  className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary"
                />
                <span className="text-sm">None</span>
              </label>

              {rubrics.platform.length > 0 && (
                <div className="border-t border-neutral-200 pt-2 mt-2">
                  <div className="font-medium text-sm text-neutral-700 mb-2">
                    Platform Rubrics
                  </div>
                  <div className="ml-4 space-y-1">
                    {rubrics.platform.map((rubric) => (
                      <label
                        key={rubric.id}
                        className={`flex items-center gap-2 p-1 rounded cursor-pointer ${
                          rubric.id.startsWith("platform-")
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-neutral-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="editRubric"
                          value={rubric.id}
                          checked={formData.rubricId === rubric.id}
                          onChange={(e) => {
                            if (!rubric.id.startsWith("platform-")) {
                              setFormData((prev) => ({
                                ...prev,
                                rubricId: e.target.value,
                              }));
                            }
                          }}
                          disabled={rubric.id.startsWith("platform-")}
                          className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary"
                        />
                        <span className="text-sm">
                          {rubric.name}{" "}
                          {rubric.id.startsWith("platform-") &&
                            "(Template - Save to use)"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {rubrics.teacher.length > 0 && (
                <div className="border-t border-neutral-200 pt-2 mt-2">
                  <div className="font-medium text-sm text-neutral-700 mb-2">
                    Your Rubrics
                  </div>
                  <div className="ml-4 space-y-1">
                    {rubrics.teacher.map((rubric) => (
                      <label
                        key={rubric.id}
                        className="flex items-center gap-2 p-1 hover:bg-neutral-50 rounded cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="editRubric"
                          value={rubric.id}
                          checked={formData.rubricId === rubric.id}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              rubricId: e.target.value,
                            }))
                          }
                          className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary"
                        />
                        <span className="text-sm">{rubric.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Due Date (optional)
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
              }
            />
          </div>

          <Input
            label="Instructions (optional)"
            placeholder="Provide instructions for students..."
            type="textarea"
            rows={3}
            value={formData.description}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, description: value }))
            }
          />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={handleSubmit}
              disabled={!formData.title.trim() || isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Activity"}
            </Button>
          </div>
        </div>
      </Modal>

      <ProgramSelectionModal
        isOpen={isProgramModalOpen}
        onClose={() => setIsProgramModalOpen(false)}
        programs={programs}
        selectedProgramIds={formData.programIds}
        onSelectionChange={handleProgramChange}
        onSectionReset={() =>
          setFormData((prev) => ({ ...prev, sectionIds: [] }))
        }
      />

      <SectionSelectionModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        sectionsByPrograms={currentSectionsByPrograms}
        selectedSectionIds={formData.sectionIds}
        onSelectionChange={(sectionIds) =>
          setFormData((prev) => ({ ...prev, sectionIds }))
        }
        disabled={formData.programIds.length === 0 && programs.length === 0}
      />
    </>
  );
}

