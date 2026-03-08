import { useState, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import type { NewActivityForm } from "../../types/activityTypes";
import { CourseSelectionModal } from "./CourseSelectionModal";
import { SectionSelectionModal } from "./SectionSelectionModal";

interface EditActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (activity: NewActivityForm) => Promise<void>;
  initialData: NewActivityForm;
  courses: { id: string; name: string }[];
  sections: { id: string; name: string; courseId: string }[];
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
  courses,
  sections,
  rubrics,
  isSubmitting,
}: Omit<EditActivityModalProps, "sectionsBySelectedCourses">) {
  const [formData, setFormData] = useState<NewActivityForm>(initialData);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
    }
  }, [isOpen, initialData]);

  const handleClose = () => {
    setIsCourseModalOpen(false);
    setIsSectionModalOpen(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    await onSubmit(formData);
    handleClose();
  };

  const handleCourseChange = (courseIds: string[]) => {
    setFormData((prev) => {
      const newSectionIds =
        courseIds.length === 0
          ? []
          : prev.sectionIds.filter((sectionId) => {
              const section = sections.find((s) => s.id === sectionId);
              return section && courseIds.includes(section.courseId);
            });
      return { ...prev, courseIds, sectionIds: newSectionIds };
    });
  };

  // Compute sections by selected courses dynamically
  const currentSectionsByCourses = useMemo(() => {
    if (formData.courseIds.length === 0) {
      return courses.map((course) => ({
        course,
        sections: sections.filter((s) => s.courseId === course.id),
      }));
    }
    return courses
      .filter((p) => formData.courseIds.includes(p.id))
      .map((course) => ({
        course,
        sections: sections.filter((s) => s.courseId === course.id),
      }));
  }, [formData.courseIds, courses, sections]);

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

          {/* Courses Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Courses
            </label>
            <Button
              variant="outline"
              onClick={() => setIsCourseModalOpen(true)}
              className="w-full justify-between"
            >
              <span className="text-sm">
                {formData.courseIds.length === 0
                  ? "All Courses"
                  : formData.courseIds.length === 1
                  ? courses.find((p) => p.id === formData.courseIds[0])
                      ?.name || "Selected"
                  : `${formData.courseIds.length} Courses Selected`}
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
                formData.courseIds.length === 0 && courses.length === 0
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
                        className="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-neutral-50"
                      >
                        <input
                          type="radio"
                          name="editRubric"
                          value={rubric.id}
                          checked={formData.rubricId === rubric.id}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              rubricId: e.target.value,
                            }));
                          }}
                          className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary"
                        />
                        <span className="text-sm">{rubric.name}</span>
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

      <CourseSelectionModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        courses={courses}
        selectedCourseIds={formData.courseIds}
        onSelectionChange={handleCourseChange}
        onSectionReset={() =>
          setFormData((prev) => ({ ...prev, sectionIds: [] }))
        }
      />

      <SectionSelectionModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        sectionsByCourses={currentSectionsByCourses}
        selectedSectionIds={formData.sectionIds}
        onSelectionChange={(sectionIds) =>
          setFormData((prev) => ({ ...prev, sectionIds }))
        }
        disabled={formData.courseIds.length === 0 && courses.length === 0}
      />
    </>
  );
}

