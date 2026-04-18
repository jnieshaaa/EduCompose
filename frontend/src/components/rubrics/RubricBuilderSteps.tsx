import { useState, useEffect } from "react";
import Button from "../ui/Button";
import { Plus, Trash2, Save, ChevronRight, Loader2, Eye, Pencil } from "lucide-react";
import { RubricPreviewTable } from "./RubricPreviewTable";
import type { RubricFormData, CriteriaRow, ScoreLevel } from "./types";
import { supabase } from "../../lib/supabaseClient";

// --- STEP 1: RUBRIC DETAILS FORM (College-only) ---

interface RubricDetailsFormProps {
  formData: RubricFormData;
  onFormChange: (updates: Partial<RubricFormData>) => void;
  onContinue: () => void;
  onCancel: () => void;
}

export function RubricDetailsForm({
  formData,
  onFormChange,
  onContinue,
  onCancel,
}: RubricDetailsFormProps) {
  const gradingIntensities = [
    "Basic",
    "Professional",
    "Advanced",
    "Technical",
  ] as const;
  const [programs, setPrograms] = useState<Array<{ id: number; name: string }>>(
    [],
  );
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);

  // Fetch programs from Supabase  - using programs_lookup
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const { data, error } = await supabase
          .from("programs_lookup")
          .select("id, name")
          .order("name", { ascending: true });

        if (error) {
          console.error("Error loading programs:", error);
          setPrograms([]);
        } else {
          setPrograms((data || []).map((p) => ({ id: p.id, name: p.name })));
        }
      } catch (err) {
        console.error("Unexpected error loading programs:", err);
        setPrograms([]);
      } finally {
        setIsLoadingPrograms(false);
      }
    };

    fetchPrograms();
  }, []);

  // Validation: Continue button is disabled if name is empty or no programs selected
  const isFormValid =
    formData.name.trim() !== "" && formData.programs.length > 0;

  const toggleProgram = (programName: string) => {
    const currentPrograms = formData.programs;
    if (currentPrograms.includes(programName)) {
      onFormChange({
        programs: currentPrograms.filter((p) => p !== programName),
      });
    } else {
      onFormChange({ programs: [...currentPrograms, programName] });
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h4 className="text-xl font-bold text-neutral-900">Rubric Details</h4>
        <p className="text-sm text-neutral-400 mt-1 font-medium">
          Configure basic settings before building your criteria
        </p>
      </div>

      {/* ─── Form Fields ─── */}
      <div className="space-y-5">
        {/* Rubric Name */}
        <div>
          <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">
            Rubric Name <span className="text-tertiary">*</span>
          </label>
          <input
            id="rubric-name"
            type="text"
            placeholder="e.g., Argumentative Essay Rubric"
            value={formData.name}
            onChange={(e) => onFormChange({ name: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 focus:bg-white transition-all placeholder:text-neutral-300"
          />
        </div>

        {/* Grading Intensity */}
        <div>
          <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">
            Grading Intensity <span className="text-tertiary">*</span>
          </label>
          <p className="text-xs text-neutral-400 mb-3 font-medium">
            Controls how strict or lenient the AI grading will be
          </p>
          <div className="flex gap-1.5">
            {gradingIntensities.map((intensity) => (
              <button
                key={intensity}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  formData.gradingIntensity === intensity
                    ? "bg-primary text-white shadow-sm shadow-primary/20"
                    : "bg-neutral-50 text-neutral-500 border border-neutral-200 hover:border-primary/20 hover:text-primary"
                }`}
                onClick={() => onFormChange({ gradingIntensity: intensity })}
              >
                {intensity}
              </button>
            ))}
          </div>
        </div>

        {/* Program Selection */}
        <div>
          <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">
            Programs <span className="text-tertiary">*</span>
          </label>
          <p className="text-xs text-neutral-400 mb-3 font-medium">
            This rubric will be available for courses within the selected program(s)
          </p>
          {isLoadingPrograms ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              <span className="text-xs text-neutral-400">Loading programs…</span>
            </div>
          ) : programs.length === 0 ? (
            <p className="text-xs text-neutral-400 py-3 italic">
              No programs available. Please create a program first.
            </p>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              {programs.map((program) => (
                <button
                  key={program.id}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    formData.programs.includes(program.name)
                      ? "bg-primary text-white shadow-sm shadow-primary/20"
                      : "bg-neutral-50 text-neutral-500 border border-neutral-200 hover:border-primary/20 hover:text-primary"
                  }`}
                  onClick={() => toggleProgram(program.name)}
                >
                  {program.name}
                </button>
              ))}
            </div>
          )}
          {formData.programs.length > 0 && (
            <p className="text-[11px] text-primary font-bold mt-2">
              {formData.programs.length} selected: {formData.programs.join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div className="flex items-center justify-end gap-2.5 pt-5 border-t border-neutral-100">
        <Button variant="ghost" onClick={onCancel} className="text-sm">
          Cancel
        </Button>
        <Button
          className="bg-primary hover:bg-primary-300 text-white font-bold text-sm h-10 px-5 shadow-md shadow-primary/15"
          onClick={onContinue}
          disabled={!isFormValid}
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// --- STEP 2: RUBRIC CRITERIA EDITOR ---

interface RubricCriteriaEditorProps {
  formData: RubricFormData;
  onFormChange: (updates: Partial<RubricFormData>) => void;
  onSave: () => void;
  onBack: () => void;
}

export function RubricCriteriaEditor({
  formData,
  onFormChange,
  onSave,
  onBack,
}: RubricCriteriaEditorProps) {
  const [activeSubTab, setActiveSubTab] = useState<"create" | "preview">(
    "create",
  );
  const criteriaList = formData.criteria;

  // --- Criteria Row Handlers ---
  const handleAddCriteria = () => {
    const newId =
      criteriaList.length > 0
        ? Math.max(...criteriaList.map((c) => c.id)) + 1
        : 1;
    const newCriteria: CriteriaRow = {
      id: newId,
      title: `Criteria ${newId}`,
      scores: [
        { id: 1, title: "Excellent", points: 4, description: "" },
        { id: 2, title: "Proficient", points: 3, description: "" },
        { id: 3, title: "Developing", points: 2, description: "" },
        { id: 4, title: "Beginning", points: 1, description: "" },
      ],
    };
    onFormChange({ criteria: [...criteriaList, newCriteria] });
  };

  const handleDeleteCriteria = (criteriaId: number) => {
    onFormChange({ criteria: criteriaList.filter((c) => c.id !== criteriaId) });
  };

  const handleCriteriaTitleChange = (criteriaId: number, newTitle: string) => {
    onFormChange({
      criteria: criteriaList.map((c) =>
        c.id === criteriaId ? { ...c, title: newTitle } : c,
      ),
    });
  };

  // --- Score Level Handlers ---
  const handleAddScoreLevel = (criteriaId: number) => {
    onFormChange({
      criteria: criteriaList.map((criteria) => {
        if (criteria.id === criteriaId) {
          const newScoreId =
            criteria.scores.length > 0
              ? Math.max(...criteria.scores.map((s) => s.id)) + 1
              : 1;
          const newScore: ScoreLevel = {
            id: newScoreId,
            title: "New Level",
            points: 0,
            description: "",
          };
          return { ...criteria, scores: [...criteria.scores, newScore] };
        }
        return criteria;
      }),
    });
  };

  const handleDeleteScoreLevel = (criteriaId: number, scoreId: number) => {
    onFormChange({
      criteria: criteriaList.map((criteria) => {
        if (criteria.id === criteriaId) {
          return {
            ...criteria,
            scores: criteria.scores.filter((s) => s.id !== scoreId),
          };
        }
        return criteria;
      }),
    });
  };

  const handleScoreChange = (
    criteriaId: number,
    scoreId: number,
    field: keyof ScoreLevel,
    value: string | number,
  ) => {
    onFormChange({
      criteria: criteriaList.map((criteria) => {
        if (criteria.id === criteriaId) {
          return {
            ...criteria,
            scores: criteria.scores.map((score) =>
              score.id === scoreId ? { ...score, [field]: value } : score,
            ),
          };
        }
        return criteria;
      }),
    });
  };

  return (
    <div className="space-y-5">
      {/* ─── Summary Bar ─── */}
      <div className="flex items-center justify-between bg-neutral-50 border border-neutral-100 rounded-xl px-5 py-3.5">
        <div className="flex items-center gap-4 text-xs text-neutral-500 font-medium">
          <span>
            <span className="font-bold text-neutral-700">{formData.name || "Untitled"}</span>
          </span>
          <span className="text-neutral-200">|</span>
          <span className="text-[11px] font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-md">
            {formData.gradingIntensity}
          </span>
          <span className="text-neutral-200">|</span>
          <span>
            {formData.programs.length > 0
              ? formData.programs.join(", ")
              : "No programs"}
          </span>
        </div>

        {/* Create / Preview Toggle */}
        <div className="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5">
          <button
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeSubTab === "create"
                ? "bg-primary text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
            onClick={() => setActiveSubTab("create")}
          >
            <Pencil className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
            Build
          </button>
          <button
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeSubTab === "preview"
                ? "bg-primary text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
            onClick={() => setActiveSubTab("preview")}
          >
            <Eye className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
            Preview
          </button>
        </div>
      </div>

      {/* ─── Criteria Builder ─── */}
      {activeSubTab === "create" ? (
        <div className="space-y-3">
          {criteriaList.map((criteria, idx) => (
            <div key={criteria.id} className="bg-white border border-neutral-100 rounded-xl overflow-hidden">
              {/* Criteria Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-neutral-50/50 border-b border-neutral-100">
                <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-wider w-5 flex-shrink-0">
                  C{idx + 1}
                </span>
                <input
                  type="text"
                  placeholder="Criteria title, e.g. Evidence & Analysis"
                  value={criteria.title}
                  onChange={(e) =>
                    handleCriteriaTitleChange(criteria.id, e.target.value)
                  }
                  className="flex-1 text-base font-bold text-neutral-800 bg-transparent outline-none placeholder:text-neutral-300"
                />
                <button
                  onClick={() => handleDeleteCriteria(criteria.id)}
                  className="p-1 text-neutral-300 hover:text-error-default hover:bg-error-default/5 rounded-md transition-all flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Score Levels */}
              <div className="flex gap-0 overflow-x-auto">
                {criteria.scores.map((score) => (
                  <div key={score.id} className="w-56 flex-shrink-0 border-r border-neutral-100 last:border-r-0 p-3 space-y-2">
                    {/* Score Title + Points + Delete */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={score.title}
                        onChange={(e) =>
                          handleScoreChange(criteria.id, score.id, "title", e.target.value)
                        }
                        className="flex-1 text-sm font-bold text-neutral-700 bg-transparent outline-none border-b border-transparent focus:border-primary/30 transition-colors placeholder:text-neutral-300 min-w-0"
                      />
                      <input
                        type="number"
                        value={score.points}
                        onChange={(e) =>
                          handleScoreChange(criteria.id, score.id, "points", parseInt(e.target.value) || 0)
                        }
                        className="w-11 text-center text-xs font-bold text-primary bg-primary/5 border border-primary/10 rounded-md py-1.5 outline-none focus:ring-1 focus:ring-primary/20"
                      />
                      <button
                        onClick={() => handleDeleteScoreLevel(criteria.id, score.id)}
                        className="p-0.5 text-neutral-300 hover:text-error-default transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Description */}
                    <textarea
                      className="w-full px-3 py-2.5 border border-neutral-100 rounded-lg text-xs text-neutral-600 h-28 resize-none outline-none focus:ring-1 focus:ring-primary/15 focus:border-primary/20 transition-all placeholder:text-neutral-300 leading-relaxed bg-neutral-50/50 font-medium"
                      placeholder="Describe what the student must demonstrate…"
                      value={score.description}
                      onChange={(e) =>
                        handleScoreChange(criteria.id, score.id, "description", e.target.value)
                      }
                    />
                  </div>
                ))}

                {/* Add Score Level */}
                <div className="flex items-center justify-center w-12 flex-shrink-0 border-l border-dashed border-neutral-100">
                  <button
                    className="p-1.5 text-neutral-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                    onClick={() => handleAddScoreLevel(criteria.id)}
                    title="Add score level"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add Criteria */}
          <button
            className="w-full py-3 border-2 border-dashed border-neutral-200 rounded-xl text-xs font-semibold text-neutral-400 hover:text-primary hover:border-primary/30 hover:bg-primary/[0.02] transition-all flex items-center justify-center gap-1.5"
            onClick={handleAddCriteria}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Criteria
          </button>
        </div>
      ) : (
        <RubricPreviewTable criteriaList={criteriaList} />
      )}

      {/* ─── Footer ─── */}
      <div className="flex items-center justify-between pt-5 border-t border-neutral-100">
        <span className="text-[10px] text-neutral-400">
          <span className="font-bold text-neutral-600">{criteriaList.length}</span> criteria
        </span>
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" onClick={onBack} className="text-sm">
            Back
          </Button>
          <Button
            className="bg-primary hover:bg-primary-300 text-white font-bold text-sm h-10 px-5 shadow-md shadow-primary/15"
            onClick={onSave}
            disabled={criteriaList.length === 0}
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save Rubric
          </Button>
        </div>
      </div>
    </div>
  );
}
