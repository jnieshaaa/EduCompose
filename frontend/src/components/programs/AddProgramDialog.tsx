import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import Input from "../ui/Input";
import { Textarea } from "../ui/textarea";
import Button from "../ui/Button";
import { PROGRAM_DETAILS } from "../../data/classOptions";

interface AddProgramDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newProgram: {
    name: string;
    description: string;
    tracks: string;
    status: string;
  };
  onInputChange: (field: string, value: string) => void;
  onSubmit: () => void;
  isCreating: boolean;
}

export function AddProgramDialog({
  isOpen,
  onClose,
  newProgram,
  onInputChange,
  onSubmit,
  isCreating,
}: AddProgramDialogProps) {
  // Autocomplete state for program name
  const [programSuggestions, setProgramSuggestions] = useState<
    typeof PROGRAM_DETAILS
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleNameChange = (value: string) => {
    onInputChange("name", value);

    // Handle autocomplete for program name
    if (value.trim().length > 0) {
      const filtered = PROGRAM_DETAILS.filter(
        (program) =>
          program.name.toLowerCase().includes(value.toLowerCase()) ||
          program.code.toLowerCase().includes(value.toLowerCase())
      );
      setProgramSuggestions(filtered.slice(0, 10)); // Limit to 10 suggestions
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } else {
      setProgramSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle program selection from autocomplete
  const handleProgramSelect = (program: (typeof PROGRAM_DETAILS)[0]) => {
    onInputChange("name", program.name);
    onInputChange("description", program.description);
    setShowSuggestions(false);
    setProgramSuggestions([]);
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
          prev < programSuggestions.length - 1 ? prev + 1 : prev
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
    if (newProgram.name.trim().length > 0) {
      const filtered = PROGRAM_DETAILS.filter(
        (program) =>
          program.name.toLowerCase().includes(newProgram.name.toLowerCase()) ||
          program.code.toLowerCase().includes(newProgram.name.toLowerCase())
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
          <div className="relative">
            <Label htmlFor="program-name">Program Name</Label>
            <div className="relative mt-1">
              <Input
                id="program-name"
                placeholder="e.g., BS Computer Science or BSCS"
                className="mt-0"
                value={newProgram.name}
                onChange={handleNameChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              {/* Autocomplete Suggestions Dropdown */}
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
          </div>
          <div>
            <Label htmlFor="program-desc">Description</Label>
            <Textarea
              id="program-desc"
              placeholder="Brief description of the program/department"
              className="mt-1"
              value={newProgram.description}
              onChange={(e) => onInputChange("description", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="program-tracks">Number of Course Tracks</Label>
              <Input
                id="program-tracks"
                type="number"
                placeholder="0"
                className="mt-1"
                value={newProgram.tracks}
                onChange={(value) => onInputChange("tracks", value)}
              />
            </div>
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
              {isCreating ? "Creating..." : "Create Program"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

