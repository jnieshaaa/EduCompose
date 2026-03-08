import Modal from "../ui/Modal";
import Button from "../ui/Button";

interface SectionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionsByCourses: Array<{
    course: { id: string; name: string };
    sections: { id: string; name: string; courseId: string }[];
  }>;
  selectedSectionIds: string[];
  onSelectionChange: (sectionIds: string[]) => void;
  disabled?: boolean;
}

export function SectionSelectionModal({
  isOpen,
  onClose,
  sectionsByCourses,
  selectedSectionIds,
  onSelectionChange,
  disabled = false,
}: SectionSelectionModalProps) {
  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange([]);
    }
  };

  const handleToggleSection = (sectionId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedSectionIds, sectionId]);
    } else {
      onSelectionChange(selectedSectionIds.filter((id) => id !== sectionId));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Sections / Blocks"
      size="md"
      contentClassName="flex flex-col overflow-hidden p-0"
    >
      <div className="flex flex-col flex-1 overflow-hidden px-6 pb-6">
        <div className="border border-neutral-300 rounded-lg p-3 flex-1 overflow-y-auto">
          <label className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={selectedSectionIds.length === 0}
              onChange={(e) => handleToggleAll(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
            />
            <span className="text-sm font-medium">All Sections</span>
          </label>
          <div className="border-t border-neutral-200 pt-2 space-y-3">
            {sectionsByCourses.map(
              ({ course, sections: courseSections }) => (
                <div key={course.id}>
                   <div className="font-medium text-sm text-neutral-700 mb-2">
                    {course.name}
                  </div>
                  <div className="ml-4 space-y-1">
                    {courseSections.map((section) => (
                      <label
                        key={section.id}
                        className="flex items-center gap-2 p-1 hover:bg-neutral-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSectionIds.includes(section.id)}
                          onChange={(e) =>
                            handleToggleSection(section.id, e.target.checked)
                          }
                          disabled={disabled}
                          className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm">{section.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
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
