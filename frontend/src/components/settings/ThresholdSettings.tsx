// Threshold Settings Section Component (View)

import React from "react";
import { AlertTriangle, Save, Loader2 } from "lucide-react";
import { ScrollableSection } from "./ScrollableSection";
import { Slider } from "../ui/slider";
import Button from "../ui/Button";
import type { ThresholdSettings } from "../../types/settingsTypes";

interface ThresholdSettingsProps {
  id: string;
  thresholds: ThresholdSettings;
  isLoading: boolean;
  isSaving: boolean;
  onThresholdChange: (thresholds: Partial<ThresholdSettings>) => void;
  onSaveThresholds: () => void;
}

const thresholdItems: {
  key: keyof ThresholdSettings;
  label: string;
  desc: string;
  max: number;
  min: number;
  step: number;
  unit: string;
}[] = [
  { key: "grammarThreshold", label: "Grammar", desc: "Warn if grammar score falls below", max: 100, min: 0, step: 5, unit: "%" },
  { key: "coherenceThreshold", label: "Coherence", desc: "Warn if coherence score falls below", max: 100, min: 0, step: 5, unit: "%" },
  { key: "plagiarismThreshold", label: "Plagiarism Risk", desc: "Flag essays with similarity above", max: 100, min: 0, step: 5, unit: "%" },
  { key: "vocabularyThreshold", label: "Vocabulary Level", desc: "Warn if complexity is below", max: 10, min: 1, step: 1, unit: "/10" },
];

export const ThresholdSettingsComponent: React.FC<ThresholdSettingsProps> = ({
  id,
  thresholds,
  isLoading,
  isSaving,
  onThresholdChange,
  onSaveThresholds,
}) => {
  return (
    <ScrollableSection
      id={id}
      title="Warning Thresholds"
      icon={AlertTriangle}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-neutral-400">Loading…</span>
        </div>
      ) : (
        <div className="space-y-5">
          {thresholdItems.map((item) => {
            const value = thresholds[item.key];
            return (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-xs font-semibold text-neutral-700">{item.label}</span>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{item.desc}</p>
                  </div>
                  <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                    {value}{item.unit}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[value]}
                    max={item.max}
                    min={item.min}
                    step={item.step}
                    className="flex-1"
                    onValueChange={(v) =>
                      onThresholdChange({ [item.key]: v[0] })
                    }
                    disabled={isSaving}
                  />
                  <input
                    type="number"
                    value={value}
                    onChange={(e) =>
                      onThresholdChange({
                        [item.key]: Math.min(
                          item.max,
                          Math.max(item.min, parseInt(e.target.value) || item.min)
                        ),
                      })
                    }
                    className="w-14 px-2 py-1.5 border border-neutral-200 rounded-lg text-xs text-center bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/15 focus:bg-white transition-all"
                    disabled={isSaving}
                  />
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <Button
              className="bg-primary hover:bg-primary-300 text-white font-bold text-sm h-9 px-4 shadow-md shadow-primary/15"
              onClick={onSaveThresholds}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Thresholds
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </ScrollableSection>
  );
};
