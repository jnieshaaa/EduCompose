import { useState } from "react";
import {
  RubricDetailsForm,
  RubricCriteriaEditor,
} from "./RubricBuilderSteps";
import type { RubricFormData } from "../../types/rubricTypes";

interface ScratchModeViewProps {
  formData: RubricFormData;
  onFormChange: (updates: Partial<RubricFormData>) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ScratchModeView({
  formData,
  onFormChange,
  onSave,
  onCancel,
}: ScratchModeViewProps) {
  const [step, setStep] = useState<"details" | "criteria">("details");

  const handleContinue = () => {
    setStep("criteria");
  };

  const handleBack = () => {
    setStep("details");
  };

  return (
    <div className="w-full mt-6 p-6 border rounded-lg shadow-md bg-white">
      <h3 className="text-2xl font-semibold text-neutral-900 mb-6">
        {step === "details" ? "Rubric Details" : "Build Your Rubric"}
      </h3>

      {step === "details" ? (
        <RubricDetailsForm
          formData={formData}
          onFormChange={onFormChange}
          onContinue={handleContinue}
          onCancel={onCancel}
        />
      ) : (
        <RubricCriteriaEditor
          formData={formData}
          onFormChange={onFormChange}
          onSave={onSave}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

