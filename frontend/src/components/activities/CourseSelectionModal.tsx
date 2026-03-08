import Modal from "../ui/Modal";
import Button from "../ui/Button";

interface CourseSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: { id: string; name: string }[];
  selectedCourseIds: string[];
  onSelectionChange: (courseIds: string[]) => void;
  onSectionReset?: () => void;
}

export function CourseSelectionModal({
  isOpen,
  onClose,
  courses,
  selectedCourseIds,
  onSelectionChange,
  onSectionReset,
}: CourseSelectionModalProps) {
  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange([]);
      onSectionReset?.();
    }
  };

  const handleToggleCourse = (courseId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedCourseIds, courseId]);
    } else {
      const newCourseIds = selectedCourseIds.filter((id) => id !== courseId);
      onSelectionChange(newCourseIds);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Courses"
      size="md"
      contentClassName="flex flex-col overflow-hidden p-0"
    >
      <div className="flex flex-col flex-1 overflow-hidden px-6 pb-6">
        <div className="border border-neutral-300 rounded-lg p-3 flex-1 overflow-y-auto">
          <label className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={selectedCourseIds.length === 0}
              onChange={(e) => handleToggleAll(e.target.checked)}
              className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
            />
            <span className="text-sm font-medium">All Courses</span>
          </label>
          {courses.map((course) => (
            <label
              key={course.id}
              className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedCourseIds.includes(course.id)}
                onChange={(e) =>
                  handleToggleCourse(course.id, e.target.checked)
                }
                className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
              />
              <span className="text-sm">{course.name}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0 mt-4">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
