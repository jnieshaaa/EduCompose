import { Loader2 } from "lucide-react";
import Modal from "../ui/Modal";

interface GradingProgressModalProps {
  isOpen: boolean;
  progress: number; // 0-100
  currentStep: string;
  onClose?: () => void;
}

export function GradingProgressModal({
  isOpen,
  progress,
  currentStep,
  onClose,
}: GradingProgressModalProps) {
  // Calculate circumference for circular progress
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      size="md"
      closeOnBackdropClick={false}
      contentClassName="flex flex-col items-center justify-center py-12"
    >
      <div className="flex flex-col items-center space-y-6">
        {/* Circular Progress */}
        <div className="relative w-32 h-32">
          <svg className="transform -rotate-90 w-32 h-32">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-neutral-200"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="text-primary transition-all duration-300"
            />
          </svg>
          {/* Center spinner */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          {/* Progress percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-semibold text-neutral-900">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Current step text */}
        <div className="text-center">
          <p className="text-lg font-medium text-neutral-900 mb-2">
            Grading Essay...
          </p>
          <p className="text-sm text-neutral-600">{currentStep}</p>
        </div>
      </div>
    </Modal>
  );
}

