// AI Assessment Settings Section Component (View)

import React from "react";
import { Settings, Save, Loader2 } from "lucide-react";
import { ScrollableSection } from "./ScrollableSection";
import { Label } from "../ui/label";
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
    <ScrollableSection id={id} title="AI Evaluation Settings" icon={Settings}>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="enable-grammar">Enable Grammar Analysis</Label>
              <p className="text-sm text-neutral-500 mt-1">
                Automatically check grammar and mechanics
              </p>
            </div>
            <Switch
              id="enable-grammar"
              checked={settings.enableGrammar}
              onCheckedChange={(checked) =>
                onSettingsChange({ enableGrammar: checked })
              }
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="enable-coherence">
                Enable Coherence Analysis
              </Label>
              <p className="text-sm text-neutral-500 mt-1">
                Analyze logical flow and organization
              </p>
            </div>
            <Switch
              id="enable-coherence"
              checked={settings.enableCoherence}
              onCheckedChange={(checked) =>
                onSettingsChange({ enableCoherence: checked })
              }
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="enable-plagiarism">
                Enable Plagiarism Detection
              </Label>
              <p className="text-sm text-neutral-500 mt-1">
                Check for originality and proper citations
              </p>
            </div>
            <Switch
              id="enable-plagiarism"
              checked={settings.enablePlagiarism}
              onCheckedChange={(checked) =>
                onSettingsChange({ enablePlagiarism: checked })
              }
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="enable-vocabulary">
                Enable Vocabulary Analysis
              </Label>
              <p className="text-sm text-neutral-500 mt-1">
                Assess vocabulary complexity and usage
              </p>
            </div>
            <Switch
              id="enable-vocabulary"
              checked={settings.enableVocabulary}
              onCheckedChange={(checked) =>
                onSettingsChange({ enableVocabulary: checked })
              }
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="enable-structure">
                Enable Structure Analysis
              </Label>
              <p className="text-sm text-neutral-500 mt-1">
                Evaluate essay organization and structure
              </p>
            </div>
            <Switch
              id="enable-structure"
              checked={settings.enableStructure}
              onCheckedChange={(checked) =>
                onSettingsChange({ enableStructure: checked })
              }
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="auto-evaluate">Auto-Evaluate on Submission</Label>
              <p className="text-sm text-neutral-500 mt-1">
                Run AI evaluation immediately after essay submission
              </p>
            </div>
            <Switch
              id="auto-evaluate"
              checked={settings.autoEvaluate}
              onCheckedChange={(checked) =>
                onSettingsChange({ autoEvaluate: checked })
              }
              disabled={isSaving}
            />
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={onSaveSettings}
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

