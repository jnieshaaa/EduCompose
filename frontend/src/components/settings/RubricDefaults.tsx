// Rubric Defaults Section Component (View)

import React from "react";
import { BookOpen, Save, Loader2 } from "lucide-react";
import { ScrollableSection } from "./ScrollableSection";
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
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-neutral-400">Loading…</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">
              Default Rubric Template
            </label>
            <select
              id="default-rubric"
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all disabled:opacity-50 font-medium"
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
              <p className="text-[10px] text-neutral-300 mt-1.5 ml-0.5 italic">
                No rubrics available. Create one first.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between py-3 border-t border-b border-neutral-50">
            <div className="min-w-0 pr-4">
              <span className="text-sm font-bold text-neutral-800 tracking-tight">Auto-Apply to New Programs</span>
              <p className="text-[11px] font-bold text-neutral-400 mt-1 uppercase tracking-wide leading-tight">
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

          <div className="flex justify-end pt-3">
            <Button
              className="bg-primary hover:bg-primary-300 text-white font-bold text-sm h-9 px-4 shadow-md shadow-primary/15"
              onClick={onSaveDefaults}
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
