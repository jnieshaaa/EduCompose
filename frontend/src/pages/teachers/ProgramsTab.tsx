import { useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Plus, BookOpen } from "lucide-react";
import { UnifiedStudentBatchUploadDialog } from "../../components/students/UnifiedStudentBatchUploadDialog";
import { useAlert } from "../../hooks/useAlert";
import { usePrograms } from "../../hooks/usePrograms";
import { AddProgramDialog } from "../../components/programs/AddProgramDialog";
import { ProgramsStatsCards } from "../../components/programs/ProgramsStatsCards";
import { ProgramsFilters } from "../../components/programs/ProgramsFilters";
import { ProgramsCardView } from "../../components/programs/ProgramsCardView";
import { ProgramsTableView } from "../../components/programs/ProgramsTableView";
import type { Program } from "../../types/programs";

export function ProgramsTab() {
  const { showSuccess } = useAlert();
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Removed: Teachers cannot delete programs, so selection mode is not needed
  // const [isSelectionMode, setIsSelectionMode] = useState(false);
  // const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    programs,
    allPrograms,
    isLoading,
    loadError,
    searchQuery,
    isAddDialogOpen,
    isCreating,
    stats,
    setSearchQuery,
    setIsAddDialogOpen,
    handleCreateProgram,
    handleProgramClick,
    handleDeleteProgram,
    handleBatchUploadComplete,
    AlertComponent,
  } = usePrograms();
  //     window.confirm(
  //       `Are you sure you want to delete ${selectedIds.length} programs?`
  //     )
  //   ) {
  //     // In a real app, call your API here
  //     showSuccess(`Deleted ${selectedIds.length} programs successfully`);
  //     handleCancelSelectionMode();
  //   }
  // };

  const handleEditProgram = (program: Program) => {
    console.log("Edit program:", program);
  };

  const handleArchiveProgram = (program: Program) => {
    showSuccess(`Archived program: ${program.name}`);
  };

  // handleDeleteProgram is already provided by usePrograms hook

  // Removed: Selection check not needed

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

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-2">
          <Button
            className="bg-primary hover:bg-primary-300"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Program
          </Button>

          <UnifiedStudentBatchUploadDialog onComplete={handleBatchUploadComplete} />
          {/* Removed: Teachers cannot delete programs */}
        </div>
      </div>

      {/* Summary Stats */}
      <ProgramsStatsCards
        totalPrograms={stats.totalPrograms}
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
          onEditProgram={handleEditProgram}
          onArchiveProgram={handleArchiveProgram}
          onDeleteProgram={handleDeleteProgram}
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
        onSubmit={handleCreateProgram}
        isCreating={isCreating}
      />

      {/* Alert Modal */}
      <AlertComponent />
    </div>
  );
}
