import Modal from "../ui/Modal";
import Button from "../ui/Button";

interface ProgramSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  programs: { id: string; name: string }[];
  selectedProgramIds: string[];
  onSelectionChange: (programIds: string[]) => void;
  onSectionReset?: () => void;
}

export function ProgramSelectionModal({
  isOpen,
  onClose,
  programs,
  selectedProgramIds,
  onSelectionChange,
  onSectionReset,
}: ProgramSelectionModalProps) {
  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange([]);
      onSectionReset?.();
    }
  };

  const handleToggleProgram = (programId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedProgramIds, programId]);
    } else {
      const newProgramIds = selectedProgramIds.filter((id) => id !== programId);
      onSelectionChange(newProgramIds);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Programs"
      size="md"
      contentClassName="flex flex-col overflow-hidden p-0"
    >
      <div className="flex flex-col flex-1 overflow-hidden px-6 pb-6">
        <div className="border border-neutral-300 rounded-lg p-3 flex-1 overflow-y-auto">
          <label className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={selectedProgramIds.length === 0}
              onChange={(e) => handleToggleAll(e.target.checked)}
              className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
            />
            <span className="text-sm font-medium">All Programs</span>
          </label>
          {programs.map((program) => (
            <label
              key={program.id}
              className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedProgramIds.includes(program.id)}
                onChange={(e) =>
                  handleToggleProgram(program.id, e.target.checked)
                }
                className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
              />
              <span className="text-sm">{program.name}</span>
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
