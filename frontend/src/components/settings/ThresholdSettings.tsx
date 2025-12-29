// Threshold Settings Section Component (View)

import React from "react";
import { AlertTriangle, Save, Loader2 } from "lucide-react";
import { ScrollableSection } from "./ScrollableSection";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import Input from "../ui/Input";
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
      title="Thresholds for Warnings"
      icon={AlertTriangle}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <Label htmlFor="threshold-grammar">
              Grammar Warning Threshold ({thresholds.grammarThreshold}%)
            </Label>
            <p className="text-sm text-neutral-500 mb-3">
              Show warning if grammar score falls below this percentage
            </p>
            <div className="flex items-center gap-4">
              <Slider
                id="threshold-grammar"
                value={[thresholds.grammarThreshold]}
                max={100}
                min={0}
                step={5}
                className="flex-1"
                onValueChange={(value) =>
                  onThresholdChange({ grammarThreshold: value[0] })
                }
                disabled={isSaving}
              />
              <Input
                type="number"
                value={thresholds.grammarThreshold}
                onChange={(value) =>
                  onThresholdChange({
                    grammarThreshold: Math.min(
                      100,
                      Math.max(0, parseInt(value) || 0)
                    ),
                  })
                }
                className="w-20 text-center"
                disabled={isSaving}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="threshold-coherence">
              Coherence Warning Threshold ({thresholds.coherenceThreshold}%)
            </Label>
            <p className="text-sm text-neutral-500 mb-3">
              Show warning if coherence score falls below this percentage
            </p>
            <div className="flex items-center gap-4">
              <Slider
                id="threshold-coherence"
                value={[thresholds.coherenceThreshold]}
                max={100}
                min={0}
                step={5}
                className="flex-1"
                onValueChange={(value) =>
                  onThresholdChange({ coherenceThreshold: value[0] })
                }
                disabled={isSaving}
              />
              <Input
                type="number"
                value={thresholds.coherenceThreshold}
                onChange={(value) =>
                  onThresholdChange({
                    coherenceThreshold: Math.min(
                      100,
                      Math.max(0, parseInt(value) || 0)
                    ),
                  })
                }
                className="w-20 text-center"
                disabled={isSaving}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="threshold-plagiarism">
              Plagiarism Risk Threshold ({thresholds.plagiarismThreshold}%)
            </Label>
            <p className="text-sm text-neutral-500 mb-3">
              Flag essays with plagiarism similarity above this percentage
            </p>
            <div className="flex items-center gap-4">
              <Slider
                id="threshold-plagiarism"
                value={[thresholds.plagiarismThreshold]}
                max={100}
                min={0}
                step={5}
                className="flex-1"
                onValueChange={(value) =>
                  onThresholdChange({ plagiarismThreshold: value[0] })
                }
                disabled={isSaving}
              />
              <Input
                type="number"
                value={thresholds.plagiarismThreshold}
                onChange={(value) =>
                  onThresholdChange({
                    plagiarismThreshold: Math.min(
                      100,
                      Math.max(0, parseInt(value) || 0)
                    ),
                  })
                }
                className="w-20 text-center"
                disabled={isSaving}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="threshold-vocabulary">
              Minimum Vocabulary Level ({thresholds.vocabularyThreshold}/10)
            </Label>
            <p className="text-sm text-neutral-500 mb-3">
              Show warning if vocabulary complexity is below this level (1-10)
            </p>
            <div className="flex items-center gap-4">
              <Slider
                id="threshold-vocabulary"
                value={[thresholds.vocabularyThreshold]}
                max={10}
                min={1}
                step={1}
                className="flex-1"
                onValueChange={(value) =>
                  onThresholdChange({ vocabularyThreshold: value[0] })
                }
                disabled={isSaving}
              />
              <Input
                type="number"
                value={thresholds.vocabularyThreshold}
                onChange={(value) =>
                  onThresholdChange({
                    vocabularyThreshold: Math.min(
                      10,
                      Math.max(1, parseInt(value) || 1)
                    ),
                  })
                }
                className="w-20 text-center"
                disabled={isSaving}
              />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={onSaveThresholds}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
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

