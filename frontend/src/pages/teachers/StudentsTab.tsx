import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Plus, GraduationCap } from "lucide-react";
import { useAlert } from "../../hooks/useAlert";
import { useStudents } from "../../hooks/useStudents";
import { AddStudentDialog } from "../../components/students/AddStudentDialog";
import { EditStudentDialog } from "../../components/students/EditStudentDialog";
import { StudentsStatsCards } from "../../components/students/StudentsStatsCards";
import { StudentsFilters } from "../../components/students/StudentsFilters";
import { StudentsCardView } from "../../components/students/StudentsCardView";
import { StudentsTableView } from "../../components/students/StudentsTableView";

export function StudentsTab() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { AlertComponent } = useAlert();
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");

  // Read filters from URL params (for drill-down from Sections/Blocks)
  const urlBlockId = searchParams.get("block");
  const urlBlockName = searchParams.get("blockName");

  const {
    students,
    isLoading,
    loadError,
    searchQuery,
    programFilter,
    sectionFilter,
    isAddDialogOpen,
    isEditDialogOpen,
    editingStudent,
    availablePrograms,
    availableSections,
    hasActiveFilters,
    setSearchQuery,
    setProgramFilter,
    setSectionFilter,
    setIsAddDialogOpen,
    setIsEditDialogOpen,
    setEditingStudent,
    handleUpdateStudent,
    handleDeleteStudent,
    handleEditStudent,
    handleClearFilters,
    handleClearProgramFilter,
    handleClearSectionFilter,
    refreshStudents,
  } = useStudents(urlBlockId || undefined);

  const handleViewEssayHistory = (student: { id: string }) => {
    navigate(`/Teacher/Gradebook?studentId=${encodeURIComponent(student.id)}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      {/* Header - Simplified as Breadcrumb shows the path */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-3">
            {urlBlockName ? (
              <>
                <div className="w-1.5 h-8 bg-primary rounded-full" />
                {urlBlockName} Students
              </>
            ) : "Students Management"}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {urlBlockName 
              ? `Managing class list for block ${urlBlockName}` 
              : "Comprehensive student directory and institutional records"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-primary hover:bg-primary-300 shadow-lg shadow-primary/20"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StudentsStatsCards
        students={students}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Filters */}
      <StudentsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        programFilter={programFilter}
        sectionFilter={sectionFilter}
        onProgramFilterChange={setProgramFilter}
        onSectionFilterChange={setSectionFilter}
        availablePrograms={availablePrograms}
        availableSections={availableSections}
        urlProgramFilter={null}
        urlSectionFilter={urlBlockId}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        onClearProgramFilter={handleClearProgramFilter}
        onClearSectionFilter={handleClearSectionFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loadError={loadError}
      />

      {/* Students Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-neutral-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : students.length === 0 ? (
        <Card className="p-12 text-center">
          <GraduationCap className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-700 mb-2">
            No students found
          </h3>
          <p className="text-sm text-neutral-500 mb-4">
            {hasActiveFilters ? (
              <>
                No students found matching the current filters.{" "}
                <button
                  onClick={handleClearFilters}
                  className="text-primary hover:underline"
                >
                  Clear filters
                </button>
              </>
            ) : (
              "Get started by adding your first student."
            )}
          </p>
          {!hasActiveFilters && (
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          )}
        </Card>
      ) : viewMode === "cards" ? (
        <StudentsCardView
          students={students}
          urlSectionFilter={urlBlockId}
          onEditStudent={handleEditStudent}
          onDeleteStudent={handleDeleteStudent}
          onViewEssayHistory={handleViewEssayHistory}
        />
      ) : (
        <StudentsTableView
          students={students}
          urlSectionFilter={urlBlockId}
          onEditStudent={handleEditStudent}
          onDeleteStudent={handleDeleteStudent}
          onViewEssayHistory={handleViewEssayHistory}
        />
      )}

      {/* Add Student Dialog */}
      <AddStudentDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        blockId={urlBlockId || ""}
        onSuccess={refreshStudents}
      />

      {/* Edit Student Dialog */}
      <EditStudentDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingStudent(null);
        }}
        editingStudent={editingStudent}
        onStudentChange={setEditingStudent}
        onSubmit={handleUpdateStudent}
        availablePrograms={availablePrograms}
        availableSections={availableSections}
        urlProgramFilter={null}
        urlSectionFilter={urlBlockId}
      />

      {/* Alert Modals */}
      <AlertComponent />
    </div>
  );
}
