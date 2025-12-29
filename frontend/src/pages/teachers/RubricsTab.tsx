import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, X } from "lucide-react";
import Button from "../../components/ui/Button";
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
} from "../../services/rubricService";

export function RubricsTab() {
  const [searchParams] = useSearchParams();
  const urlSearchQuery = searchParams.get("search");

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
      const data = await saveRubric(rubricFormData, teacherId);

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

      // Switch view back to list
      setCurrentView("list");
      setSelectedMode(null);

      // Switch to "My rubrics" tab to show the new rubric
      setActiveTab("my");
    } catch (err) {
      console.error("Unexpected error saving rubric:", err);
    }
  };

  const handleCancelMode = () => {
    setSelectedMode(null);
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
    } catch (err) {
      console.error("Unexpected error saving template rubric:", err);
    }
  };

  return (
    <div className='space-y-6 p-6'>
      {/* HEADER */}
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl text-neutral-900 font-semibold'>
          {currentView === "options" ? "New Rubric" : "Rubrics"}
        </h1>
        <div className='flex gap-2'>
          {currentView === "list" && (
            <Button
              className='bg-primary hover:bg-primary-300'
              onClick={handleCreateClick}
            >
              <Plus className='w-4 h-4 mr-2' />
              Create New Rubric
            </Button>
          )}

          {currentView === "options" && (
            <Button variant='outline' onClick={handleBackToList}>
              <X className='w-4 h-4 mr-2' />
              Close
            </Button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}

      {/* View 2/3: Creation Options and Dynamic Builder */}
      {currentView === "options" && (
        <div className='w-full space-y-6'>
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

      {/* View 1: Main Rubric List Screen */}
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
