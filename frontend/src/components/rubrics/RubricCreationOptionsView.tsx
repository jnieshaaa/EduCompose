import { Upload, FileCheck, Edit } from "lucide-react";
import Card from "../ui/Card";
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
    mode: BuilderMode;
  }[] = [
    { icon: Upload, title: "Upload or import", mode: "upload" },
    {
      icon: FileCheck,
      title: "Build from an existing template",
      mode: "template",
    },
    { icon: Edit, title: "Build from scratch", mode: "scratch" },
  ];

  return (
    <Card className="p-6">
      <div className="grid grid-cols-3 gap-4 pb-4 border-b border-neutral-200 mb-6">
        {options.map((option) => (
          <Card
            key={option.mode}
            className={`p-4 flex flex-col items-center text-center cursor-pointer transition-colors border shadow-sm h-32 justify-center ${
              option.mode === selectedMode
                ? "border-primary bg-purple-50 ring-2 ring-primary/50"
                : "hover:bg-neutral-50"
            }`}
            onClick={() => onModeSelect(option.mode)}
          >
            <option.icon className="w-6 h-6 text-primary mb-2" />
            <h3 className="text-sm font-medium text-neutral-900 whitespace-nowrap">
              {option.title}
            </h3>
          </Card>
        ))}
      </div>
    </Card>
  );
}

