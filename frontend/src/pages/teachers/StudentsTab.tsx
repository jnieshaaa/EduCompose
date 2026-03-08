import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Plus, GraduationCap, ChevronRight, Folder, Users } from "lucide-react";
import { BatchUploadDialog } from "../../components/ui/BatchUploadDialog";
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

  // Read filters from URL params (for drill-down from Sections)
  const urlProgramFilter = searchParams.get("program");
  const urlSectionFilter = searchParams.get("section");
  const urlCourseId = searchParams.get("courseId");
  const urlCourseCode = searchParams.get("courseCode");

  const {
    students,
    isLoading,
    loadError,
    searchQuery,
    programFilter,
    sectionFilter,
    isAddDialogOpen,
    newStudent,
    isCreatingStudent,
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
    handleInputChange,
    handleCreateStudent,
    handleEditStudent,
    handleUpdateStudent,
    handleDeleteStudent,
    handleClearFilters,
    handleClearProgramFilter,
    handleClearSectionFilter,
    handleBatchUploadComplete,
    AlertComponent: StudentsAlertComponent,
  } = useStudents();

  const handleViewEssayHistory = (student: { id: string }) => {
    navigate(`/Teacher/Gradebook?studentId=${encodeURIComponent(student.id)}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Breadcrumbs */}
      {(urlCourseCode || urlProgramFilter || urlSectionFilter) && (
        <nav className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
          <button 
            onClick={() => navigate('/Teacher/Courses')}
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <Folder size={12} />
            Courses
          </button>
          
          {urlCourseCode && (
            <>
              <ChevronRight size={12} className="text-neutral-300" />
              <button 
                onClick={() => navigate(`/Teacher/Courses?courseId=${urlCourseId}`)}
                className="hover:text-primary transition-colors"
              >
                {urlCourseCode}
              </button>
            </>
          )}

          {urlProgramFilter && (
            <>
              <ChevronRight size={12} className="text-neutral-300" />
              <span className="text-neutral-500">{urlProgramFilter}</span>
            </>
          )}

          {urlSectionFilter && (
            <>
              <ChevronRight size={12} className="text-neutral-300" />
              <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-md font-bold">
                <Users size={12} />
                {urlSectionFilter}
              </div>
            </>
          )}
          
          <ChevronRight size={12} className="text-neutral-300" />
          <span className="text-neutral-300">Students</span>
        </nav>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-3">
            {urlSectionFilter ? (
              <>
                <div className="w-1.5 h-8 bg-primary rounded-full" />
                {urlSectionFilter}
              </>
            ) : "Students Management"}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {urlCourseCode && (
              <span className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded text-xs font-mono font-bold">
                {urlCourseCode}
              </span>
            )}
            <p className="text-sm text-neutral-500">
              {urlCourseCode ? (
                <>Class list and performance tracking</>
              ) : hasActiveFilters ? (
                `Viewing ${students.length} filtered records`
              ) : (
                "Comprehensive student directory and activity logs"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-primary hover:bg-primary-300"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
          <BatchUploadDialog
            type="students"
            existingStudents={students}
            availablePrograms={availablePrograms}
            availableSections={availableSections}
            defaultProgram={
              urlProgramFilter && urlProgramFilter !== "All Programs"
                ? urlProgramFilter
                : undefined
            }
            defaultSection={
              urlSectionFilter && urlSectionFilter !== "All Sections"
                ? urlSectionFilter
                : undefined
            }
            onUploadComplete={handleBatchUploadComplete}
          />
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
        urlProgramFilter={urlProgramFilter}
        urlSectionFilter={urlSectionFilter}
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
          urlProgramFilter={urlProgramFilter}
          urlSectionFilter={urlSectionFilter}
          onEditStudent={handleEditStudent}
          onDeleteStudent={handleDeleteStudent}
          onViewEssayHistory={handleViewEssayHistory}
        />
      ) : (
        <StudentsTableView
          students={students}
          urlProgramFilter={urlProgramFilter}
          urlSectionFilter={urlSectionFilter}
          onEditStudent={handleEditStudent}
          onDeleteStudent={handleDeleteStudent}
          onViewEssayHistory={handleViewEssayHistory}
        />
      )}

      {/* Add Student Dialog */}
      <AddStudentDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        newStudent={newStudent}
        onInputChange={handleInputChange}
        onSubmit={handleCreateStudent}
        availablePrograms={availablePrograms}
        availableSections={availableSections}
        urlProgramFilter={urlProgramFilter}
        urlSectionFilter={urlSectionFilter}
        isCreating={isCreatingStudent}
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
        urlProgramFilter={urlProgramFilter}
        urlSectionFilter={urlSectionFilter}
      />

      {/* Alert Modals */}
      <AlertComponent />
      <StudentsAlertComponent />
    </div>
  );
}
