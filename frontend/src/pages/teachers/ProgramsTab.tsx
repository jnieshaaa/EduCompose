import { useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Plus, BookOpen, Trash2, X, CheckSquare } from "lucide-react";
import { BatchUploadDialog } from "../../components/ui/BatchUploadDialog";
import { useAlert } from "../../hooks/useAlert";
import { usePrograms } from "../../hooks/usePrograms";
import { AddProgramDialog } from "../../components/programs/AddProgramDialog";
import { ProgramsStatsCards } from "../../components/programs/ProgramsStatsCards";
import { ProgramsFilters } from "../../components/programs/ProgramsFilters";
import { ProgramsCardView } from "../../components/programs/ProgramsCardView";
import { ProgramsTableView } from "../../components/programs/ProgramsTableView";
import type { Program } from "../../data/programsData";

export function ProgramsTab() {
  const { AlertComponent, showSuccess } = useAlert();
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // State to toggle the "Select to Delete" mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  // --- Selection Handlers ---

  const handleSelectAll = () => {
    setSelectedIds(programs.map((p) => String(p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleCancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  // --- Action Handlers ---

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedIds.length} programs?`
      )
    ) {
      // In a real app, call your API here
      showSuccess(`Deleted ${selectedIds.length} programs successfully`);
      handleCancelSelectionMode();
    }
  };

  const handleEditProgram = (program: Program) => {
    console.log("Edit program:", program);
  };

  const handleArchiveProgram = (program: Program) => {
    showSuccess(`Archived program: ${program.name}`);
  };

  const handleDeleteProgram = (program: Program) => {
    if (window.confirm(`Are you sure you want to delete ${program.name}?`)) {
      showSuccess(`Deleted program: ${program.name}`);
    }
  };

  // Check if all displayed programs are selected
  const isAllSelected =
    programs.length > 0 && selectedIds.length === programs.length;

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
          {/* 1. SELECTION MODE ACTIONS (Visible when "Select to Delete" is active) */}
          {isSelectionMode ? (
            <>
              {/* Select All Button */}
              <Button
                variant="outline"
                onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
                className="text-neutral-700 border-neutral-300"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                {isAllSelected ? "Deselect All" : "Select All"}
              </Button>

              <Button
                variant="ghost"
                onClick={handleCancelSelectionMode}
                className="text-neutral-600"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>

              <Button
                className="bg-error-default hover:bg-error-dark text-white border-none animate-in fade-in zoom-in duration-200"
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedIds.length})
              </Button>
            </>
          ) : (
            /* 2. NORMAL ACTIONS (Visible by default) */
            <>
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
              <Button
                variant="outline"
                className="text-error-default border-error-default/30 hover:bg-error-default/5"
                onClick={() => setIsSelectionMode(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          )}
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
