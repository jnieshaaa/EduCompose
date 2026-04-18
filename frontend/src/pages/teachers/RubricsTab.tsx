import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, ArrowLeft } from "lucide-react";
import Button from "../../components/ui/Button";
import { useAlert } from "../../hooks/useAlert";
import { RubricsListView } from "../../components/rubrics/RubricsListView";
import { RubricCreationOptionsView } from "../../components/rubrics/RubricCreationOptionsView";
import { UploadModeView } from "../../components/rubrics/UploadModeView";
import { TemplateModeView } from "../../components/rubrics/TemplateModeView";
import { ScratchModeView } from "../../components/rubrics/ScratchModeView";
import { RubricPreviewModal } from "../../components/rubrics/RubricPreviewModal";
import type {
  RubricView,
  BuilderMode,
  RubricFormData,
  PlatformRubric,
  RubricTemplate,
  CriteriaRow,
} from "../../types/rubricTypes";
import {
  defaultRubricFormData,
  initialCriteria,
} from "../../components/rubrics/types";
import {
  fetchTeacherId,
  fetchTeacherRubrics,
  saveRubric,
  saveTemplateRubric,
  deleteRubric,
  updateRubric,
  fetchRubricById,
} from "../../services/rubricService";

export function RubricsTab() {
  const [searchParams] = useSearchParams();
  const urlSearchQuery = searchParams.get("search");
  const { showError, showSuccess, AlertComponent } = useAlert();

  const [currentView, setCurrentView] = useState<RubricView>("list");
  const [selectedMode, setSelectedMode] = useState<BuilderMode>(null);

  const [activeTab, setActiveTab] = useState<"platform" | "my">("platform");
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery || "");

  // Lifted state: savedRubrics loaded from Supabase
  const [savedRubrics, setSavedRubrics] = useState<
    (RubricTemplate & {
      fullData?: Record<string, unknown>;
      programsList?: string[];
    })[]
  >([]);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(true);
  const [teacherId, setTeacherId] = useState<number | null>(null);

  // Form state for the rubric builder
  const [rubricFormData, setRubricFormData] = useState<RubricFormData>(
    defaultRubricFormData
  );
  const [editingRubricId, setEditingRubricId] = useState<number | null>(null);

  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedPreviewRubric, setSelectedPreviewRubric] =
    useState<PlatformRubric | null>(null);
  const [selectedMyRubric, setSelectedMyRubric] =
    useState<PlatformRubric | null>(null);

  // Get current teacher ID and load rubrics from Supabase
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingRubrics(true);
      try {
        const id = await fetchTeacherId();
        if (id) {
          setTeacherId(id);
          const rubrics = await fetchTeacherRubrics(id);
          setSavedRubrics(rubrics);
        }
      } catch (err) {
        console.error("Error loading rubrics:", err);
      } finally {
        setIsLoadingRubrics(false);
      }
    };

    loadData();
  }, []);

  // Sync searchQuery with URL params
  useEffect(() => {
    if (urlSearchQuery !== null) {
      setSearchQuery(urlSearchQuery);
    }
  }, [urlSearchQuery]);

  // Handlers
  const handleCreateClick = () => {
    setCurrentView("options");
    setSelectedMode(null);
    setEditingRubricId(null);
    // Reset form data for new rubric
    setRubricFormData({
      ...defaultRubricFormData,
      criteria: [
        ...initialCriteria.map((c) => ({
          ...c,
          scores: c.scores.map((s) => ({ ...s })),
        })),
      ],
    });
  };

  // Edit rubric handler
  const handleEditRubric = async (rubricId: number) => {
    try {
      const rubric = await fetchRubricById(rubricId);
      if (!rubric || !rubric.fullData) {
        showError("Failed to load rubric for editing.");
        return;
      }

      const fullData = rubric.fullData as {
        name: string;
        criteria: CriteriaRow[];
        type: string;
        programs: string[];
      };

      // Convert fullData to RubricFormData format
      setRubricFormData({
        name: fullData.name,
        gradingIntensity: fullData.type as "Basic" | "Professional" | "Advanced" | "Technical",
        programs: fullData.programs || [],
        criteria: fullData.criteria || [],
      });

      setEditingRubricId(rubricId);
      setCurrentView("options");
      setSelectedMode("scratch");
      setActiveTab("my");
    } catch (err) {
      console.error("Error loading rubric for editing:", err);
      showError("Failed to load rubric for editing. Please try again.");
    }
  };

  // Delete rubric handler
  const handleDeleteRubric = async (rubricId: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this rubric? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteRubric(rubricId);

      // Remove from local state
      setSavedRubrics((prev) => prev.filter((r) => r.id !== rubricId));

      showSuccess("Rubric deleted successfully!");
    } catch (err) {
      console.error("Error deleting rubric:", err);
      showError("Failed to delete rubric. Please try again.");
    }
  };

  const handleModeSelection = (mode: BuilderMode) => {
    setSelectedMode(mode);
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedMode(null);
  };

  const handleFormChange = (updates: Partial<RubricFormData>) => {
    setRubricFormData((prev) => ({ ...prev, ...updates }));
  };

  // Save rubric handler
  const handleSaveRubric = async () => {
    if (!teacherId) {
      console.error("Teacher ID not available");
      return;
    }

    try {
      let data;
      if (editingRubricId) {
        // Update existing rubric
        data = await updateRubric(editingRubricId, rubricFormData, teacherId);

        // Extract programs from dedicated column
        const programs = (data.programs as string[]) || [];

        // Map to RubricTemplate format and update in local state
        const updatedRubric: RubricTemplate & { programsList?: string[] } = {
          id: data.id,
          name: data.name,
          criteria: rubricFormData.criteria.length,
          programs: programs.length,
          lastUsed: new Date().toISOString().split("T")[0],
          level: "College",
          programsList: programs,
        };

        // Update the rubric in the savedRubrics list
        setSavedRubrics((prev) =>
          prev.map((r) => (r.id === editingRubricId ? updatedRubric : r))
        );

        setEditingRubricId(null);
        showSuccess("Rubric updated successfully!");
      } else {
        // Create new rubric
        data = await saveRubric(rubricFormData, teacherId);

        // Extract programs from dedicated column
        const programs = (data.programs as string[]) || [];

        // Map to RubricTemplate format and add to local state
        const newRubric: RubricTemplate & { programsList?: string[] } = {
          id: data.id,
          name: data.name,
          criteria: rubricFormData.criteria.length,
          programs: programs.length,
          lastUsed: new Date().toISOString().split("T")[0],
          level: "College",
          programsList: programs,
        };

        // Add to the savedRubrics list
        setSavedRubrics((prev) => [newRubric, ...prev]);

        // Switch to "My rubrics" tab to show the new rubric
        setActiveTab("my");
        showSuccess("Rubric saved successfully!");
      }

      // Switch view back to list
      setCurrentView("list");
      setSelectedMode(null);
    } catch (err) {
      console.error("Error saving rubric:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to save rubric. Please try again.";
      showError(errorMessage);
    }
  };

  const handleCancelMode = () => {
    setSelectedMode(null);
    setEditingRubricId(null);
  };

  // Preview modal handlers
  const handlePreviewRubric = (rubric: PlatformRubric) => {
    setSelectedPreviewRubric(rubric);
    setPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setSelectedPreviewRubric(null);
    setSelectedMyRubric(null);
  };

  const handlePreviewMyRubric = (
    rubric: RubricTemplate & {
      fullData?: Record<string, unknown>;
      programsList?: string[];
    }
  ) => {
    if (rubric.fullData) {
      setSelectedMyRubric(rubric.fullData as unknown as PlatformRubric);
      setPreviewModalOpen(true);
    }
  };

  const handleUseTemplate = async (rubric: PlatformRubric) => {
    if (!teacherId) {
      console.error("Teacher ID not available");
      return;
    }

    try {
      const data = await saveTemplateRubric(rubric, teacherId);

      // Map to RubricTemplate format and add to local state
      const newRubric: RubricTemplate & { programsList?: string[] } = {
        id: data.id,
        name: rubric.name,
        criteria: rubric.criteria.length,
        programs: 0, // Template rubrics have no specific programs
        lastUsed: new Date().toISOString().split("T")[0],
        level: "College",
        programsList: [],
      };
      setSavedRubrics((prev) => [newRubric, ...prev]);
      handleClosePreview();
      setActiveTab("my");
      showSuccess(`Rubric "${rubric.name}" copied to My Rubrics successfully!`);
    } catch (err) {
      console.error("Error saving template rubric:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to save rubric. Please try again.";
      showError(errorMessage);
    }
  };

  return (
    <div className="p-6 space-y-0">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {currentView === "options" && (
            <button
              onClick={handleBackToList}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-neutral-900">
              {currentView === "options"
                ? editingRubricId
                  ? "Edit Rubric"
                  : "New Rubric"
                : "Rubrics"}
            </h1>
            {currentView === "list" && (
              <p className="text-sm text-neutral-400 mt-1">
                Manage grading rubrics for your essay activities
              </p>
            )}
          </div>
        </div>

        {currentView === "list" && (
          <Button
            className="bg-primary hover:bg-primary-300 text-white font-bold text-sm h-10 px-5 shadow-md shadow-primary/15 rounded-xl"
            onClick={handleCreateClick}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Rubric
          </Button>
        )}
      </div>

      {/* ─── Creation Flow ─── */}
      {currentView === "options" && (
        <div className="space-y-0">
          <RubricCreationOptionsView
            selectedMode={selectedMode}
            onModeSelect={handleModeSelection}
          />

          {/* Render mode-specific content */}
          {selectedMode === "upload" && (
            <UploadModeView
              onCancel={handleCancelMode}
              onImportSuccess={(rubricData) => {
                // Set the imported rubric data to the form
                setRubricFormData(rubricData);
                // Switch to scratch mode to show the imported rubric
                setSelectedMode("scratch");
              }}
            />
          )}

          {selectedMode === "template" && (
            <TemplateModeView
              onCancel={handleCancelMode}
              onPreviewRubric={handlePreviewRubric}
            />
          )}

          {selectedMode === "scratch" && (
            <ScratchModeView
              formData={rubricFormData}
              onFormChange={handleFormChange}
              onSave={handleSaveRubric}
              onCancel={handleCancelMode}
            />
          )}
        </div>
      )}

      {/* ─── Rubric List ─── */}
      {currentView === "list" && (
        <RubricsListView
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          savedRubrics={savedRubrics}
          isLoadingRubrics={isLoadingRubrics}
          onCreateClick={handleCreateClick}
          onPreviewRubric={handlePreviewRubric}
          onPreviewMyRubric={handlePreviewMyRubric}
          onEditRubric={handleEditRubric}
          onDeleteRubric={handleDeleteRubric}
        />
      )}

      {/* Preview Modal for Platform Rubrics */}
      {selectedPreviewRubric && (
        <RubricPreviewModal
          rubric={selectedPreviewRubric}
          isOpen={previewModalOpen}
          onClose={handleClosePreview}
          onUseTemplate={handleUseTemplate}
        />
      )}

      {/* Alert Modal */}
      <AlertComponent />

      {/* Preview Modal for My Rubrics */}
      {selectedMyRubric && (
        <RubricPreviewModal
          rubric={selectedMyRubric}
          isOpen={previewModalOpen}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}
