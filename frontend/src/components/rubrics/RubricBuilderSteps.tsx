import { useState, useEffect } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { Label } from "../ui/label";
import { Plus, Trash2 } from "lucide-react";
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
    []
  );
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);

  // Fetch programs from Supabase
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const { data, error } = await supabase
          .from("programs")
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
      <p className="text-lg font-medium">
        Configure basic settings before building your criteria.
      </p>

      <div className="space-y-6 border p-4 rounded-lg">
        <h4 className="text-lg font-semibold">Rubric Details</h4>

        {/* Rubric Name */}
        <div>
          <Label htmlFor="rubric-name" className="font-medium">
            Rubric Name *
          </Label>
          <p className="text-sm text-neutral-500 mb-2">
            Give your rubric a descriptive name
          </p>
          <Input
            id="rubric-name"
            placeholder="e.g., Argumentative Essay Rubric"
            value={formData.name}
            onChange={(value) => onFormChange({ name: value })}
          />
        </div>

        {/* Grading Intensity */}
        <div>
          <Label className="font-medium">Grading Intensity *</Label>
          <p className="text-sm text-neutral-500 mb-2">
            Control how strict or lenient the AI grading should be.
          </p>
          <div className="flex gap-2">
            {gradingIntensities.map((intensity) => (
              <Button
                key={intensity}
                size="sm"
                variant={
                  formData.gradingIntensity === intensity
                    ? "primary"
                    : "outline"
                }
                className={
                  formData.gradingIntensity === intensity
                    ? "bg-primary text-white"
                    : ""
                }
                onClick={() => onFormChange({ gradingIntensity: intensity })}
              >
                {intensity}
              </Button>
            ))}
          </div>
        </div>

        {/* Program Selection */}
        <div>
          <Label className="font-medium">Programs *</Label>
          <p className="text-sm text-neutral-500 mb-2">
            This rubric will be available for courses within the selected
            program(s). You can select multiple programs.
          </p>
          {isLoadingPrograms ? (
            <p className="text-sm text-neutral-500">Loading programs...</p>
          ) : programs.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No programs available. Please create a program first.
            </p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {programs.map((program) => (
                <Button
                  key={program.id}
                  size="sm"
                  variant={
                    formData.programs.includes(program.name)
                      ? "primary"
                      : "outline"
                  }
                  className={
                    formData.programs.includes(program.name)
                      ? "bg-primary text-white hover:bg-primary-300"
                      : ""
                  }
                  onClick={() => toggleProgram(program.name)}
                >
                  {program.name}
                </Button>
              ))}
            </div>
          )}
          {formData.programs.length > 0 && (
            <p className="text-sm text-primary mt-2">
              Selected: {formData.programs.join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-end gap-2 pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="bg-primary hover:bg-primary-300"
          onClick={onContinue}
          disabled={!isFormValid}
        >
          Continue
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
    "create"
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
        c.id === criteriaId ? { ...c, title: newTitle } : c
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
    value: string | number
  ) => {
    onFormChange({
      criteria: criteriaList.map((criteria) => {
        if (criteria.id === criteriaId) {
          return {
            ...criteria,
            scores: criteria.scores.map((score) =>
              score.id === scoreId ? { ...score, [field]: value } : score
            ),
          };
        }
        return criteria;
      }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Details Summary */}
      <div className="space-y-2 border-b pb-4">
        <h4 className="text-xl font-semibold">Build from Scratch</h4>
        <div className="flex flex-wrap gap-4 text-sm text-neutral-600">
          <span>
            <strong>Name:</strong> {formData.name || "Untitled"}
          </span>
          <span>
            <strong>Programs:</strong>{" "}
            {formData.programs.length > 0
              ? formData.programs.join(", ")
              : "Not set"}
          </span>
          <span>
            <strong>Intensity:</strong> {formData.gradingIntensity}
          </span>
        </div>
      </div>

      {/* Create/Preview Toggle */}
      <div className="flex items-center gap-4">
        <Button
          size="sm"
          variant={activeSubTab === "create" ? "primary" : "outline"}
          className={
            activeSubTab === "create" ? "bg-primary hover:bg-primary-300" : ""
          }
          onClick={() => setActiveSubTab("create")}
        >
          Create
        </Button>
        <Button
          size="sm"
          variant={activeSubTab === "preview" ? "primary" : "outline"}
          className={
            activeSubTab === "preview" ? "bg-primary hover:bg-primary-300" : ""
          }
          onClick={() => setActiveSubTab("preview")}
        >
          Preview
        </Button>
      </div>

      {/* Conditional View Rendering */}
      {activeSubTab === "create" ? (
        <div className="space-y-4">
          {criteriaList.map((criteria) => (
            <div key={criteria.id} className="border p-4 rounded-lg space-y-4">
              {/* Criteria Title and Delete Button */}
              <div className="flex items-center gap-2 border-b pb-2">
                <Input
                  placeholder="Criteria Title - for example, Evidence"
                  value={criteria.title}
                  onChange={(value) =>
                    handleCriteriaTitleChange(criteria.id, value)
                  }
                  className="flex-grow font-medium"
                />
                <Button
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => handleDeleteCriteria(criteria.id)}
                >
                  <Trash2 className="w-4 h-4 text-neutral-500" />
                </Button>
              </div>

              {/* Score Levels Container */}
              <div className="flex gap-4 overflow-x-auto pb-2">
                {criteria.scores.map((score) => (
                  <div key={score.id} className="w-64 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        value={score.title}
                        onChange={(value) =>
                          handleScoreChange(
                            criteria.id,
                            score.id,
                            "title",
                            value
                          )
                        }
                        className="font-medium p-2 text-center flex-grow"
                      />
                      <Input
                        type="number"
                        value={String(score.points)}
                        onChange={(value) =>
                          handleScoreChange(
                            criteria.id,
                            score.id,
                            "points",
                            parseInt(value) || 0
                          )
                        }
                        className="w-12 text-center p-2"
                      />
                      <Button
                        variant="ghost"
                        className="p-0 h-auto w-auto shrink-0"
                        onClick={() =>
                          handleDeleteScoreLevel(criteria.id, score.id)
                        }
                      >
                        <Trash2 className="w-4 h-4 text-neutral-500" />
                      </Button>
                    </div>
                    <textarea
                      className="w-full p-2 border rounded-md text-sm h-32 resize-none"
                      placeholder="Enter the requirements the student needs to demonstrate to get this grade."
                      value={score.description}
                      onChange={(e) =>
                        handleScoreChange(
                          criteria.id,
                          score.id,
                          "description",
                          e.target.value
                        )
                      }
                    />
                  </div>
                ))}

                {/* Add Score Level Column Button */}
                <div className="flex flex-col justify-end">
                  <Button
                    variant="ghost"
                    className="p-2 h-auto w-auto self-end mb-2 border border-dashed border-neutral-300 hover:bg-neutral-100"
                    onClick={() => handleAddScoreLevel(criteria.id)}
                  >
                    <Plus className="w-4 h-4 text-neutral-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Add Criteria Button */}
          <Button
            variant="ghost"
            className="text-primary hover:text-primary-300"
            onClick={handleAddCriteria}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Criteria
          </Button>
        </div>
      ) : (
        <RubricPreviewTable criteriaList={criteriaList} />
      )}

      {/* Footer Buttons */}
      <div className="flex justify-end gap-2 pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="bg-primary hover:bg-primary-300"
          onClick={onSave}
          disabled={criteriaList.length === 0}
        >
          Save Rubric
        </Button>
      </div>
    </div>
  );
}
