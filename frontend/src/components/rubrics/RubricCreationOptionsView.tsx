import { Upload, FileCheck, Edit } from "lucide-react";
import type { BuilderMode } from "../../types/rubricTypes";

interface RubricCreationOptionsViewProps {
  selectedMode: BuilderMode;
  onModeSelect: (mode: BuilderMode) => void;
}

export function RubricCreationOptionsView({
  selectedMode,
  onModeSelect,
}: RubricCreationOptionsViewProps) {
  const options: {
    icon: React.ElementType;
    title: string;
    desc: string;
    mode: BuilderMode;
  }[] = [
    { icon: Upload, title: "Upload File", desc: "Excel or JSON file", mode: "upload" },
    { icon: FileCheck, title: "Use Template", desc: "Start from a template", mode: "template" },
    { icon: Edit, title: "Create New", desc: "Build from scratch", mode: "scratch" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mb-1">
      {options.map((option) => (
        <button
          key={option.mode}
          className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border transition-all text-center ${
            option.mode === selectedMode
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-neutral-100 bg-neutral-50 hover:border-neutral-200 hover:bg-white"
          }`}
          onClick={() => onModeSelect(option.mode)}
        >
          <option.icon className={`w-5 h-5 ${
            option.mode === selectedMode ? "text-primary" : "text-neutral-400"
          }`} />
          <span className={`text-sm font-bold ${
            option.mode === selectedMode ? "text-primary" : "text-neutral-700"
          }`}>
            {option.title}
          </span>
          <span className="text-[11px] font-bold text-neutral-400">
            {option.desc}
          </span>
        </button>
      ))}
    </div>
  );
}
