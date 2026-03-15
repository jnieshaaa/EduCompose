import { useState, useEffect, useMemo } from "react";

import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import type { NewActivityForm } from "../../types/activityTypes";


interface EditActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (activity: NewActivityForm) => Promise<void>;
  initialData: NewActivityForm;
  courses: { id: string; name: string }[];
  programLoads: {
    id: string;
    program_id: string;
    program_name: string;
    course_id: string;
  }[];
  sections: { id: string; name: string; courseId: string; programLoadId: string }[];
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
  programLoads,
  sections,
  rubrics,
  isSubmitting,
}: EditActivityModalProps) {
  const [formData, setFormData] = useState<NewActivityForm>(initialData);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedProgramLoadIds, setSelectedProgramLoadIds] = useState<string[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);

  // Get current date and time in local timezone for min attribute
  const todayDateTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);

      const courseId = initialData.courseIds[0] || "";
      const sectionIds = initialData.sectionIds || [];

      setSelectedCourseId(courseId);
      setSelectedSectionIds(sectionIds);

      if (sectionIds.length > 0) {
        const currentSections = sections.filter((s) => sectionIds.includes(s.id));
        const programIds = Array.from(new Set(currentSections.map(s => s.programLoadId)));
        setSelectedProgramLoadIds(programIds);
      } else if (courseId) {
        // If no section but has course, maybe it's "all" for that course
        setSelectedProgramLoadIds([]);
      }
    }
  }, [isOpen, initialData, sections]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    const submissionData = {
      ...formData,
      courseIds: selectedCourseId ? [selectedCourseId] : [],
      sectionIds: selectedSectionIds, // Multiple sections sent
    };

    await onSubmit(submissionData);
    handleClose();
  };

  // Filter programs based on selected course
  const filteredPrograms = useMemo(() => {
    if (!selectedCourseId) return [];
    return programLoads.filter((p) => p.course_id === selectedCourseId);
  }, [selectedCourseId, programLoads]);

  // Filter sections based on selected program load
  const filteredSections = useMemo(() => {
    if (selectedProgramLoadIds.length === 0) return [];
    return sections.filter((s) => selectedProgramLoadIds.includes(s.programLoadId));
  }, [selectedProgramLoadIds, sections]);

  // Reset dependent selections when parent changes
  const handleCourseChange = (id: string) => {
    setSelectedCourseId(id);
    setSelectedProgramLoadIds([]);
    setSelectedSectionIds([]);
  };

  const handleProgramToggle = (id: string) => {
    setSelectedProgramLoadIds((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        return prev.filter((pId) => pId !== id);
      }
      return [...prev, id];
    });
    // Optional: Reset sections when programs change
    setSelectedSectionIds([]);
  };

  const handleSectionToggle = (id: string) => {
    setSelectedSectionIds((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        return prev.filter((sId) => sId !== id);
      }
      return [...prev, id];
    });
  };

  return (
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select Course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Programs
            </label>
            <div className="w-full border border-neutral-300 rounded-lg bg-white overflow-y-auto max-h-40 p-2 space-y-1">
              {filteredPrograms.length === 0 && (
                <div className="text-sm text-neutral-400 p-1">No programs found</div>
              )}
              {filteredPrograms.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-neutral-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedProgramLoadIds.includes(p.id)}
                    onChange={() => handleProgramToggle(p.id)}
                    className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
                  />
                  <span>{p.program_name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Sections / Blocks
            </label>
            <div className="w-full border border-neutral-300 rounded-lg bg-white overflow-y-auto max-h-40 p-2 space-y-1">
              {filteredSections.length === 0 && (
                <div className="text-sm text-neutral-400 p-1">No sections found</div>
              )}
              {filteredSections.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-neutral-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedSectionIds.includes(s.id)}
                    onChange={() => handleSectionToggle(s.id)}
                    className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
                  />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          </div>
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

        {/* Due Date & Time */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Due Date & Time (optional)
          </label>
          <div className="flex gap-4">
            <input
              type="date"
              min={todayDateTime.split("T")[0]}
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              value={formData.dueDate ? formData.dueDate.split("T")[0] : ""}
              onChange={(e) => {
                const dateStr = e.target.value;
                if (!dateStr) {
                  setFormData((prev) => ({ ...prev, dueDate: "" }));
                } else {
                  const timeStr = formData.dueDate && formData.dueDate.includes("T") 
                    ? formData.dueDate.split("T")[1].slice(0, 5) 
                    : "23:59";
                  setFormData((prev) => ({ ...prev, dueDate: `${dateStr}T${timeStr}` }));
                }
              }}
            />
            <input
              type="time"
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm disabled:bg-neutral-50 disabled:text-neutral-400"
              value={formData.dueDate && formData.dueDate.includes("T") ? formData.dueDate.split("T")[1].slice(0, 5) : ""}
              onChange={(e) => {
                const timeStr = e.target.value;
                const dateStr = formData.dueDate ? formData.dueDate.split("T")[0] : "";
                if (dateStr) {
                  setFormData((prev) => ({ ...prev, dueDate: `${dateStr}T${timeStr || "23:59"}` }));
                }
              }}
              disabled={!formData.dueDate}
            />
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            * Future dates only. Time defaults to 11:59 PM.
          </p>
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
            disabled={
              !formData.title.trim() ||
              !selectedCourseId ||
              selectedSectionIds.length === 0 ||
              isSubmitting
            }
          >
            {isSubmitting ? "Updating..." : "Update Activity"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

