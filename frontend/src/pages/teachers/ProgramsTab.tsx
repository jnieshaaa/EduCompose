import { useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Plus, BookOpen } from "lucide-react";
import { BatchUploadDialog } from "../../components/ui/BatchUploadDialog";
import { useAlert } from "../../hooks/useAlert";
import { usePrograms } from "../../hooks/usePrograms";
import { AddProgramDialog } from "../../components/programs/AddProgramDialog";
import { ProgramsStatsCards } from "../../components/programs/ProgramsStatsCards";
import { ProgramsFilters } from "../../components/programs/ProgramsFilters";
import { ProgramsCardView } from "../../components/programs/ProgramsCardView";
import { ProgramsTableView } from "../../components/programs/ProgramsTableView";

export function ProgramsTab() {
  const { AlertComponent } = useAlert();
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const {
    programs,
    allPrograms,
    isLoading,
    loadError,
    searchQuery,
    isAddDialogOpen,
    newProgram,
    isCreating,
    stats,
    setSearchQuery,
    setIsAddDialogOpen,
    handleInputChange,
    handleCreateProgram,
    handleProgramClick,
    handleBatchUploadComplete,
  } = usePrograms();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900 font-semibold">Programs</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Click on a program to view its sections and students
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-primary hover:bg-primary-300"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Program
          </Button>
          <BatchUploadDialog
            type="programs"
            existingPrograms={allPrograms}
            onUploadComplete={handleBatchUploadComplete}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <ProgramsStatsCards
        activePrograms={stats.activePrograms}
        totalSections={stats.totalSections}
        totalStudents={stats.totalStudents}
      />

      {/* Search and View Toggle */}
      <ProgramsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loadError={loadError}
      />

      {/* Programs Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-neutral-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-700 mb-2">
            No programs found
          </h3>
          <p className="text-sm text-neutral-500 mb-4">
            {allPrograms.length === 0
              ? "Get started by adding your first program."
              : "Try adjusting your search query."}
          </p>
          {allPrograms.length === 0 && (
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Program
            </Button>
          )}
        </Card>
      ) : viewMode === "cards" ? (
        <ProgramsCardView
          programs={programs}
          onProgramClick={handleProgramClick}
        />
      ) : (
        <ProgramsTableView
          programs={programs}
          onProgramClick={handleProgramClick}
        />
      )}

      {/* Add Program Dialog */}
      <AddProgramDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        newProgram={newProgram}
        onInputChange={handleInputChange}
        onSubmit={handleCreateProgram}
        isCreating={isCreating}
      />

      {/* Alert Modal */}
      <AlertComponent />
    </div>
  );
}
