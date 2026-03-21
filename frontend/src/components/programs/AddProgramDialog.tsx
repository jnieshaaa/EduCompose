import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { PROGRAM_DETAILS } from "../../utils/programOptions";
import { Plus, X } from "lucide-react";

interface AddProgramDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (programs: { name: string }[]) => void;
  isCreating: boolean;
}

export function AddProgramDialog({
  isOpen,
  onClose,
  onSubmit,
  isCreating,
}: AddProgramDialogProps) {
  const [programSuggestions, setProgramSuggestions] = useState<
    typeof PROGRAM_DETAILS
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // State for multiple programs
  const [programsToAdd, setProgramsToAdd] = useState<Array<{ name: string }>>([]);
  const [currentInput, setCurrentInput] = useState("");
  // const [currentDesc, setCurrentDesc] = useState("");

  const handleNameChange = (value: string) => {
    setCurrentInput(value);

    if (value.trim().length > 0) {
      const filtered = PROGRAM_DETAILS.filter(
        (program) =>
          program.name.toLowerCase().includes(value.toLowerCase()) ||
          program.code.toLowerCase().includes(value.toLowerCase()),
      );
      setProgramSuggestions(filtered.slice(0, 10));
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } else {
      setProgramSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleProgramSelect = (program: (typeof PROGRAM_DETAILS)[0]) => {
    setCurrentInput(program.name);
    setShowSuggestions(false);
    setProgramSuggestions([]);
  };

  const handleAddProgram = () => {
    if (currentInput.trim()) {
      setProgramsToAdd([
        ...programsToAdd,
        { name: currentInput.trim() },
      ]);
      setCurrentInput("");
    }
  };

  const handleRemoveProgram = (index: number) => {
    setProgramsToAdd(programsToAdd.filter((_, i) => i !== index));
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown: React.KeyboardEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = (e) => {
    if (!showSuggestions || programSuggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < programSuggestions.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < programSuggestions.length
        ) {
          handleProgramSelect(programSuggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  const handleFocus = () => {
    if (currentInput.trim().length > 0) {
      const filtered = PROGRAM_DETAILS.filter(
        (program) =>
          program.name.toLowerCase().includes(currentInput.toLowerCase()) ||
          program.code.toLowerCase().includes(currentInput.toLowerCase()),
      );
      setProgramSuggestions(filtered.slice(0, 10));
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Program</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {/* Display added programs */}
          {programsToAdd.length > 0 && (
            <div className="space-y-2">
              <Label>Programs to Add ({programsToAdd.length})</Label>
              <div className="flex flex-wrap gap-2">
                {programsToAdd.map((program, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-rd text-sm"
                  >
                    <span className="font-medium">{program.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveProgram(index)}
                      className="hover:bg-primary/20 rounded-rs p-0.5 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <Label htmlFor="program-name">Program Name</Label>
            <div className="relative mt-1 flex gap-2">
              <div className="flex-1 relative">
                <Input
                  id="program-name"
                  placeholder="e.g., BS Computer Science or BSCS"
                  className="mt-0"
                  value={currentInput}
                  onChange={handleNameChange}
                  onKeyDown={handleKeyDown}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
                {showSuggestions && programSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {programSuggestions.map((program, index) => (
                      <div
                        key={program.code}
                        className={`px-4 py-2 cursor-pointer transition-colors ${
                          index === highlightedIndex
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-neutral-50 text-neutral-900"
                        }`}
                        onClick={() => handleProgramSelect(program)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{program.name}</div>
                            <div className="text-xs text-neutral-500 mt-0.5">
                              {program.code}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                onClick={handleAddProgram}
                disabled={!currentInput.trim()}
                className="bg-primary hover:bg-primary-400 px-3"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={() => {
                const programsToCreate: Array<{
                  name: string;
                }> = [];

                // Case 1: No programs added and field is empty → show error
                if (programsToAdd.length === 0 && !currentInput.trim()) {
                  onSubmit([]);
                  return;
                }

                // Case 2: Programs are added (regardless of field) → add them all
                if (programsToAdd.length > 0) {
                  programsToCreate.push(...programsToAdd);
                }

                // Case 3: Field has input (regardless of added programs) → add current input
                if (currentInput.trim()) {
                  programsToCreate.push({
                    name: currentInput.trim(),
                  });
                }

                // Submit the collected programs
                onSubmit(programsToCreate);

                // Reset local state after submit
                setProgramsToAdd([]);
                setCurrentInput("");
              }}
              disabled={isCreating}
              aria-busy={isCreating}
            >
              {isCreating
                ? "Creating..."
                : `Create ${programsToAdd.length + (currentInput.trim() ? 1 : 0)} Program(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
