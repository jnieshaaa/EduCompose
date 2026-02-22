import { useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Plus, Users } from "lucide-react";
import { BatchUploadDialog } from "../../components/ui/BatchUploadDialog";

import { useSections } from "../../hooks/useSections";
import { AddSectionDialog } from "../../components/sections/AddSectionDialog";
import { EditSectionDialog } from "../../components/sections/EditSectionDialog";
import { SectionsFilters } from "../../components/sections/SectionsFilters";
import { SectionsCardView } from "../../components/sections/SectionsCardView";
import { SectionsTableView } from "../../components/sections/SectionsTableView";

export function SectionsTab() {
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");

  const {
    sections,
    allSections,
    isLoading,
    loadError,
    searchQuery,
    programFilter,
    termFilter,
    isAddDialogOpen,
    newSection,
    isCreatingSection,
    isEditDialogOpen,
    editingSection,
    availablePrograms,
    programTracksMap,
    urlProgramFilter,
    isDrillDown,
    setSearchQuery,
    setProgramFilter,
    setTermFilter,
    setIsAddDialogOpen,
    setIsEditDialogOpen,
    setEditingSection,
    handleInputChange,
    handleCreateSection,
    handleEditSection,
    handleUpdateSection,
    handleDeleteSection,
    handleClearProgramFilter,
    handleSectionClick,
    handleBatchUploadComplete,
    AlertComponent,
  } = useSections();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900 font-semibold">
            {isDrillDown ? `${urlProgramFilter} Sections` : "Blocks / Sections"}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {isDrillDown
              ? "Click on a section to view its students"
              : "Manage class sections and blocks"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-primary hover:bg-primary-300"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Block
          </Button>
          <BatchUploadDialog
            type="sections"
            existingSections={allSections}
            availablePrograms={availablePrograms}
            defaultProgram={urlProgramFilter || undefined}
            onUploadComplete={handleBatchUploadComplete}
          />
        </div>
      </div>

      {/* Filters */}
      <SectionsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        programFilter={programFilter}
        termFilter={termFilter}
        onProgramFilterChange={setProgramFilter}
        onTermFilterChange={setTermFilter}
        availablePrograms={availablePrograms}
        isDrillDown={isDrillDown}
        onClearProgramFilter={handleClearProgramFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loadError={loadError}
        urlProgramFilter={urlProgramFilter}
      />

      {/* Sections Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-neutral-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-700 mb-2">
            No sections found
          </h3>
          <p className="text-sm text-neutral-500 mb-4">
            {isDrillDown ? (
              <>
                No sections found for{" "}
                <span className="font-semibold">{urlProgramFilter}</span>.
              </>
            ) : (
              "Get started by adding your first section."
            )}
          </p>
          <Button
            className="bg-primary hover:bg-primary-300"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Block
          </Button>
        </Card>
      ) : viewMode === "cards" ? (
        <SectionsCardView
          sections={sections}
          isDrillDown={isDrillDown}
          onSectionClick={handleSectionClick}
          onEditSection={handleEditSection}
          onDeleteSection={handleDeleteSection}
        />
      ) : (
        <SectionsTableView
          sections={sections}
          isDrillDown={isDrillDown}
          onSectionClick={handleSectionClick}
          onEditSection={handleEditSection}
          onDeleteSection={handleDeleteSection}
        />
      )}

      {/* Add Section Dialog */}
      <AddSectionDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        newSection={newSection}
        onInputChange={handleInputChange}
        onSubmit={handleCreateSection}
        availablePrograms={availablePrograms}
        programTracksMap={programTracksMap}
        sections={allSections}
        urlProgramFilter={urlProgramFilter}
        isCreating={isCreatingSection}
      />

      {/* Edit Section Dialog */}
      <EditSectionDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingSection(null);
        }}
        editingSection={editingSection}
        onSectionChange={setEditingSection}
        onSubmit={handleUpdateSection}
        availablePrograms={availablePrograms}
        urlProgramFilter={urlProgramFilter}
      />

      {/* Alert Modal */}
      <AlertComponent />
    </div>
  );
}
