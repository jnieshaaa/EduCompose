// AI Assessment Settings Section Component (View)

import React from "react";
import { Settings, Save, Loader2 } from "lucide-react";
import { ScrollableSection } from "./ScrollableSection";
import { Switch } from "../ui/switch";
import Button from "../ui/Button";
import type { AIAssessmentSettings } from "../../types/settingsTypes";

interface AIAssessmentSettingsProps {
  id: string;
  settings: AIAssessmentSettings;
  isLoading: boolean;
  isSaving: boolean;
  onSettingsChange: (settings: Partial<AIAssessmentSettings>) => void;
  onSaveSettings: () => void;
}

const toggleItems: {
  key: keyof AIAssessmentSettings;
  label: string;
  desc: string;
}[] = [
  { key: "enableGrammar", label: "Grammar Analysis", desc: "Check grammar and mechanics automatically" },
  { key: "enableCoherence", label: "Coherence Analysis", desc: "Analyze logical flow and organization" },
  { key: "enablePlagiarism", label: "Plagiarism Detection", desc: "Check for originality and proper citations" },
  { key: "enableVocabulary", label: "Vocabulary Analysis", desc: "Assess vocabulary complexity and usage" },
  { key: "enableStructure", label: "Structure Analysis", desc: "Evaluate essay organization and structure" },
  { key: "autoEvaluate", label: "Auto-Evaluate on Submit", desc: "Run AI evaluation immediately after submission" },
];

export const AIAssessmentSettingsComponent: React.FC<
  AIAssessmentSettingsProps
> = ({
  id,
  settings,
  isLoading,
  isSaving,
  onSettingsChange,
  onSaveSettings,
}) => {
  return (
    <ScrollableSection id={id} title="AI Evaluation" icon={Settings}>
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-neutral-400">Loading…</span>
        </div>
      ) : (
        <div className="space-y-0">
          {toggleItems.map((item, idx) => (
            <div
              key={item.key}
              className={`flex items-center justify-between py-3 ${
                idx < toggleItems.length - 1 ? "border-b border-neutral-50" : ""
              }`}
            >
              <div className="min-w-0 pr-4">
                <span className="text-sm font-bold text-neutral-800 tracking-tight">{item.label}</span>
                <p className="text-[11px] font-bold text-neutral-400 mt-1 uppercase tracking-wide leading-tight">{item.desc}</p>
              </div>
              <Switch
                checked={settings[item.key] as boolean}
                onCheckedChange={(checked) =>
                  onSettingsChange({ [item.key]: checked })
                }
                disabled={isSaving}
              />
            </div>
          ))}

          <div className="flex justify-end pt-4 border-t border-neutral-100 mt-1">
            <Button
              className="bg-primary hover:bg-primary-300 text-white font-bold text-sm h-9 px-4 shadow-md shadow-primary/15"
              onClick={onSaveSettings}
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
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </ScrollableSection>
  );
};
