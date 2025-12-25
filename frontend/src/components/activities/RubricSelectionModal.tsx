import Modal from "../ui/Modal";
import Button from "../ui/Button";

interface RubricSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  rubrics: {
    platform: { id: string; name: string }[];
    teacher: { id: string; name: string }[];
  };
  selectedRubricId: string;
  onSelectionChange: (rubricId: string) => void;
  modalName: string;
}

export function RubricSelectionModal({
  isOpen,
  onClose,
  rubrics,
  selectedRubricId,
  onSelectionChange,
  modalName,
}: RubricSelectionModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Rubric"
      size="md"
      contentClassName="flex flex-col overflow-hidden p-0"
    >
      <div className="flex flex-col flex-1 overflow-hidden px-6 pb-6">
        <div className="border border-neutral-300 rounded-lg p-3 mb-4 flex-1 overflow-y-auto max-h-full">
          <label className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded cursor-pointer mb-2">
            <input
              type="radio"
              name={modalName}
              checked={selectedRubricId === ""}
              onChange={() => onSelectionChange("")}
              className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary"
            />
            <span className="text-sm">None</span>
          </label>

          {/* Platform Rubrics */}
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
                      name={modalName}
                      value={rubric.id}
                      checked={selectedRubricId === rubric.id}
                      onChange={(e) => {
                        if (!rubric.id.startsWith("platform-")) {
                          onSelectionChange(e.target.value);
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

          {/* Teacher Rubrics */}
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
                      name={modalName}
                      value={rubric.id}
                      checked={selectedRubricId === rubric.id}
                      onChange={(e) => onSelectionChange(e.target.value)}
                      className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary"
                    />
                    <span className="text-sm">{rubric.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
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

