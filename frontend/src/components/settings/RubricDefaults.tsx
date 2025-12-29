// Rubric Defaults Section Component (View)

import React from "react";
import { BookOpen, Save, Loader2 } from "lucide-react";
import { ScrollableSection } from "./ScrollableSection";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import Button from "../ui/Button";
import type { RubricDefaults } from "../../types/settingsTypes";

interface RubricDefaultsProps {
  id: string;
  defaults: RubricDefaults;
  isLoading: boolean;
  isSaving: boolean;
  rubrics: { id: number; name: string }[];
  onDefaultsChange: (defaults: Partial<RubricDefaults>) => void;
  onSaveDefaults: () => void;
}

export const RubricDefaultsComponent: React.FC<RubricDefaultsProps> = ({
  id,
  defaults,
  isLoading,
  isSaving,
  rubrics,
  onDefaultsChange,
  onSaveDefaults,
}) => {
  return (
    <ScrollableSection id={id} title="Rubric Defaults" icon={BookOpen}>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="default-rubric">Default Rubric Template</Label>
            <select
              id="default-rubric"
              className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
              value={defaults.defaultRubricId || ""}
              onChange={(e) =>
                onDefaultsChange({
                  defaultRubricId:
                    e.target.value === "" ? null : parseInt(e.target.value),
                })
              }
              disabled={isSaving}
            >
              <option value="">None</option>
              {rubrics.map((rubric) => (
                <option key={rubric.id} value={rubric.id}>
                  {rubric.name}
                </option>
              ))}
            </select>
            {rubrics.length === 0 && (
              <p className="text-sm text-neutral-500 mt-1">
                No rubrics available. Create a rubric first to set it as
                default.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="auto-apply">Auto-Apply to New Programs</Label>
              <p className="text-sm text-neutral-500 mt-1">
                Automatically assign default rubric to new programs
              </p>
            </div>
            <Switch
              id="auto-apply"
              checked={defaults.autoApplyToNewPrograms}
              onCheckedChange={(checked) =>
                onDefaultsChange({ autoApplyToNewPrograms: checked })
              }
              disabled={isSaving}
            />
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={onSaveDefaults}
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
                  Save Defaults
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </ScrollableSection>
  );
};

