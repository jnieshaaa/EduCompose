import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ActivitiesListView } from "../../components/activities/ActivitiesListView";
import { ProgramSectionsView } from "../../components/activities/ProgramSectionsView";
import { StudentsView } from "../../components/activities/StudentsView";
import { CreateActivityModal } from "../../components/activities/CreateActivityModal";
import { EditActivityModal } from "../../components/activities/EditActivityModal";
import { useActivities } from "../../hooks/useActivities";
import type { NewActivityForm } from "../../types/activityTypes";

export function ActivitiesTab() {
  const [searchParams] = useSearchParams();
  const urlSearchQuery = searchParams.get("search");
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery || "");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(
    null
  );

  const {
    activities,
    programs,
    sections,
    rubrics,
    students,
    programSections,
    currentActivity,
    isLoading,
    isCreating,
    isLoadingStudents,
    totalActivities,
    totalSubmissions,
    upcomingDue,
    handleCreateActivity,
    handleUpdateActivity,
    handleDeleteActivity,
    handleActivityClick,
    handleProgramSectionClick,
    handleBackToSections,
    handleBackToActivities,
  } = useActivities();

  const activityId = searchParams.get("activityId");
  const programSection = searchParams.get("programSection");
  const programName = searchParams.get("programName");

  // Sync searchQuery with URL params
  useEffect(() => {
    if (urlSearchQuery !== null) {
      setSearchQuery(urlSearchQuery);
    }
  }, [urlSearchQuery]);

  // Edit handlers
  const handleEditClick = (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation();
    setEditingActivityId(activityId);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (activity: NewActivityForm) => {
    if (!editingActivityId) return;
    await handleUpdateActivity(editingActivityId, activity);
    setEditingActivityId(null);
    setIsEditModalOpen(false);
  };

  const handleDeleteClick = async (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation();
    if (
      !confirm(
        "Are you sure you want to delete this activity? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      await handleDeleteActivity(activityId);
    } catch {
      alert("Failed to delete activity. Please try again.");
    }
  };

  // Get edit activity initial data
  const editActivityInitialData = useMemo((): NewActivityForm | null => {
    if (!editingActivityId) return null;
    const activity = activities.find((a) => a.id === editingActivityId);
    if (!activity) return null;

    return {
      title: activity.title,
      programIds: activity.programId === "all" ? [] : [activity.programId],
      sectionIds: activity.blockId === "all" ? [] : [activity.blockId],
      rubricId: activity.rubricId || "",
      dueDate: activity.dueDate || "",
      description: activity.description || "",
    };
  }, [editingActivityId, activities]);

  // Render students view
  if (programSection && programName && currentActivity) {
    return (
      <StudentsView
        activity={currentActivity}
        students={students}
        programName={programName}
        programSection={programSection}
        onBack={handleBackToSections}
        isLoading={isLoadingStudents}
      />
    );
  }

  // Render program-sections view
  if (activityId && currentActivity) {
    return (
      <ProgramSectionsView
        activity={currentActivity}
        programSections={programSections}
        onBack={handleBackToActivities}
        onSectionClick={handleProgramSectionClick}
        programs={programs}
        sections={sections}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Loading activities...</p>
      </div>
    );
  }

  return (
    <>
      <ActivitiesListView
        activities={activities}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onActivityClick={handleActivityClick}
        onEditActivity={handleEditClick}
        onDeleteActivity={handleDeleteClick}
        onCreateActivity={() => setIsCreateModalOpen(true)}
        totalActivities={totalActivities}
        totalSubmissions={totalSubmissions}
        upcomingDue={upcomingDue}
        programs={programs}
        sections={sections}
        rubrics={[...rubrics.platform, ...rubrics.teacher]}
      />

      <CreateActivityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateActivity}
        programs={programs}
        sections={sections}
        rubrics={rubrics}
        isSubmitting={isCreating}
      />

      {editActivityInitialData && (
        <EditActivityModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingActivityId(null);
          }}
          onSubmit={handleEditSubmit}
          initialData={editActivityInitialData}
          programs={programs}
          sections={sections}
          rubrics={rubrics}
          isSubmitting={isCreating}
        />
      )}
    </>
  );
}
