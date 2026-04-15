import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ActivitiesListView } from "../../components/activities/ActivitiesListView";
import { CourseSectionsView } from "../../components/activities/CourseSectionsView";
import { StudentsView } from "../../components/activities/StudentsView";
import { CreateActivityModal } from "../../components/activities/CreateActivityModal";
import { EditActivityModal } from "../../components/activities/EditActivityModal";
import { useActivities } from "../../hooks/useActivities";
import type { NewActivityForm } from "../../types/activityTypes";
import { readSecureParams } from "../../utils/secureUrl";
import { useNotification } from "../../context/NotificationContext";

export function ActivitiesTab() {
  const [searchParams] = useSearchParams();
  const urlSearchQuery = searchParams.get("search");
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery || "");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(
    null,
  );
  const { showNotification } = useNotification();

  const {
    activities,
    courses,
    programLoads,
    sections,
    rubrics,
    students,
    courseSections,
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
    handleCourseSectionClick,
    handleBackToSections,
    reloadStudents,
  } = useActivities();

  // Decode secure URL params (with fallback to raw searchParams)
  const secureParams = readSecureParams(window.location.search);
  const activityId = secureParams?.activityId || searchParams.get("activityId");
  const sectionId = secureParams?.sectionId || searchParams.get("sectionId");
  const courseName = secureParams?.courseName || searchParams.get("courseName");

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
        "Are you sure you want to delete this activity? This action cannot be undone.",
      )
    ) {
      return;
    }
    try {
      await handleDeleteActivity(activityId);
    } catch {
      showNotification('error', "Failed to delete activity. Please try again.");
    }
  };

  // Get edit activity initial data
  const editActivityInitialData = useMemo((): NewActivityForm | null => {
    if (!editingActivityId) return null;
    const activity = activities.find((a) => a.id === editingActivityId);
    if (!activity) return null;

    return {
      title: activity.title,
      courseIds: activity.courseIds || [],
      sectionIds: activity.blockIds || [],
      rubricId: activity.rubricId || "",
      dueDate: activity.dueDate || "",
      description: activity.description || "",
      minWordCount: activity.minWordCount || 150,
    };
  }, [editingActivityId, activities]);

  // Render students view
  if (sectionId && courseName && currentActivity) {
    const courseSection = secureParams?.courseSection || searchParams.get("courseSection") || "";
    return (
      <StudentsView
        activity={currentActivity}
        students={students}
        courseName={courseName}
        courseSection={courseSection}
        onBack={handleBackToSections}
        isLoading={isLoadingStudents}
        onRefresh={reloadStudents}
      />
    );
  }

  // Render course-sections view
  if (activityId && currentActivity) {
    return (
      <CourseSectionsView
        activity={currentActivity}
        courseSections={courseSections}
        onSectionClick={handleCourseSectionClick}
        courses={courses}
        programLoads={programLoads}
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
        courses={courses}
        sections={sections}
        rubrics={[...rubrics.platform, ...rubrics.teacher]}
      />

      <CreateActivityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateActivity}
        courses={courses}
        programLoads={programLoads}
        sections={sections} // No mapping needed, already has courseId
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
          courses={courses}
          programLoads={programLoads}
          sections={sections} // No mapping needed, already has courseId
          rubrics={rubrics}
          isSubmitting={isCreating}
        />
      )}
    </>
  );
}
