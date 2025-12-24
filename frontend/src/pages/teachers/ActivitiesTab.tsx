import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ActivitiesListView } from "../../components/activities/ActivitiesListView";
import { ProgramSectionsView } from "../../components/activities/ProgramSectionsView";
import { StudentsView } from "../../components/activities/StudentsView";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Plus, ChevronDown } from "lucide-react";
import type {
  EssayActivity,
  NewActivityForm,
  ProgramSection,
  Student,
} from "../../types/activityTypes";
import {
  fetchTeacherActivities,
  createActivity,
  deleteActivity,
  fetchPrograms,
  fetchSections,
  fetchRubrics,
  fetchStudentsByProgramAndSection,
} from "../../services/activityService";

export function ActivitiesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activities, setActivities] = useState<EssayActivity[]>([]);
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<
    { id: string; name: string; programId: string }[]
  >([]);
  const [rubrics, setRubrics] = useState<{
    platform: { id: string; name: string }[];
    teacher: { id: string; name: string }[];
  }>({ platform: [], teacher: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Get current view state from URL params
  const activityId = searchParams.get("activityId");
  const programSection = searchParams.get("programSection");
  const programName = searchParams.get("programName");

  const [newActivity, setNewActivity] = useState<NewActivityForm>({
    title: "",
    programIds: [], // Empty array means "all programs"
    sectionIds: [], // Empty array means "all sections"
    rubricId: "",
    dueDate: "",
    description: "",
  });

  // Load activities, programs, sections, and rubrics from Supabase
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [activitiesData, programsData, sectionsData, rubricsData] =
          await Promise.all([
            fetchTeacherActivities(),
            fetchPrograms(),
            fetchSections(),
            fetchRubrics(),
          ]);

        setActivities(activitiesData);
        setPrograms(programsData);
        setSections(sectionsData);
        setRubrics(rubricsData);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Get current activity
  const currentActivity = activityId
    ? activities.find((a) => a.id === activityId)
    : null;

  // Generate program-sections for current activity from real data
  const programSections = useMemo(() => {
    if (!currentActivity) return [];

    if (currentActivity.programId === "all") {
      // Show all programs with their sections
      return programs.flatMap((program) => {
        const programSections = sections.filter(
          (s) => s.programId === program.id
        );
        return programSections.map((section) => ({
          id: `${program.id}-${section.id}`,
          name: `${program.name} - ${section.name}`,
          programName: program.name,
          sectionName: section.name,
          studentCount: 0, // TODO: Calculate from students table
          submissionCount: 0, // TODO: Calculate from essays table
        }));
      });
    } else {
      const program = programs.find((p) => p.id === currentActivity.programId);
      if (!program) return [];
      const programSections = sections.filter(
        (s) => s.programId === program.id
      );
      return programSections.map((section) => ({
        id: `${program.id}-${section.id}`,
        name: `${program.name} - ${section.name}`,
        programName: program.name,
        sectionName: section.name,
        studentCount: 0, // TODO: Calculate from students table
        submissionCount: 0, // TODO: Calculate from essays table
      }));
    }
  }, [currentActivity, programs, sections]);

  // Fetch students for selected program-section from Supabase
  const [students, setStudents] = useState<Student[]>([]);
  useEffect(() => {
    const programSection = searchParams.get("programSection");
    const programName = searchParams.get("programName");
    const activityId = searchParams.get("activityId");

    if (!programSection || !programName) {
      setStudents([]);
      return;
    }

    const loadStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const studentsData = await fetchStudentsByProgramAndSection(
          programName,
          programSection,
          activityId || undefined
        );
        setStudents(studentsData);
      } catch (err) {
        console.error("Error loading students:", err);
        setStudents([]);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    loadStudents();
  }, [searchParams]);

  // Get sections grouped by selected programs for the modal
  const sectionsBySelectedPrograms = useMemo(() => {
    if (newActivity.programIds.length === 0) {
      // Show all sections grouped by all programs
      return programs.map((program) => ({
        program,
        sections: sections.filter((s) => s.programId === program.id),
      }));
    }
    // Show sections grouped by selected programs
    return programs
      .filter((p) => newActivity.programIds.includes(p.id))
      .map((program) => ({
        program,
        sections: sections.filter((s) => s.programId === program.id),
      }));
  }, [newActivity.programIds, programs, sections]);

  // Stats
  const totalActivities = activities.length;
  const totalSubmissions = activities.reduce(
    (acc, a) => acc + a.submissionCount,
    0
  );
  const upcomingDue = activities.filter((a) => {
    if (!a.dueDate) return false;
    const due = new Date(a.dueDate);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return due >= now && due <= weekFromNow;
  }).length;

  // Event Handlers
  const handleCreateActivity = async () => {
    if (!newActivity.title.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const activity = await createActivity(newActivity);
      setActivities((prev) => [activity, ...prev]);
      setNewActivity({
        title: "",
        programIds: [],
        sectionIds: [],
        rubricId: "",
        dueDate: "",
        description: "",
      });
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error("Error creating activity:", err);
      // TODO: Show error message to user
    } finally {
      setIsCreating(false);
    }
  };

  const handleActivityClick = (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    setSearchParams({
      activityId,
      activityTitle: activity?.title || "",
    });
  };

  const handleProgramSectionClick = (section: ProgramSection) => {
    const activity = activities.find((a) => a.id === activityId);
    setSearchParams({
      activityId: activityId || "",
      activityTitle: activity?.title || "",
      programSection: section.sectionName,
      programName: section.programName,
    });
  };

  const handleBackToSections = () => {
    setSearchParams({ activityId: activityId || "" });
  };

  const handleBackToActivities = () => {
    setSearchParams({});
  };

  const handleDeleteActivity = async (
    e: React.MouseEvent,
    activityId: string
  ) => {
    e.stopPropagation();
    try {
      await deleteActivity(activityId);
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
      if (searchParams.get("activityId") === activityId) {
        setSearchParams({});
      }
    } catch (err) {
      console.error("Error deleting activity:", err);
      // TODO: Show error message to user
    }
  };

  // Render students table view
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

  // Render program-sections table view
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

  // Render default activities list view
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
        onDeleteActivity={handleDeleteActivity}
        onCreateActivity={() => setIsCreateModalOpen(true)}
        totalActivities={totalActivities}
        totalSubmissions={totalSubmissions}
        upcomingDue={upcomingDue}
        programs={programs}
        sections={sections}
        rubrics={[...rubrics.platform, ...rubrics.teacher]}
      />

      {/* Create Activity Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Essay Activity"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Essay Title"
            placeholder="e.g., Argumentative Essay on Climate Change"
            value={newActivity.title}
            onChange={(value) =>
              setNewActivity((prev) => ({ ...prev, title: value }))
            }
            required
          />

          {/* Programs Selection - Dropdown Button */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Programs
            </label>
            <Button
              variant="outline"
              onClick={() => setIsProgramModalOpen(true)}
              className="w-full justify-between"
            >
              <span className="text-sm">
                {newActivity.programIds.length === 0
                  ? "All Programs"
                  : newActivity.programIds.length === 1
                  ? programs.find((p) => p.id === newActivity.programIds[0])
                      ?.name || "Selected"
                  : `${newActivity.programIds.length} Programs Selected`}
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>

          {/* Sections Selection - Dropdown Button */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Sections / Blocks
            </label>
            <Button
              variant="outline"
              onClick={() => setIsSectionModalOpen(true)}
              className="w-full justify-between"
              disabled={
                newActivity.programIds.length === 0 && programs.length === 0
              }
            >
              <span className="text-sm">
                {newActivity.sectionIds.length === 0
                  ? "All Sections"
                  : newActivity.sectionIds.length === 1
                  ? sections.find((s) => s.id === newActivity.sectionIds[0])
                      ?.name || "Selected"
                  : `${newActivity.sectionIds.length} Sections Selected`}
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>

          {/* Rubric Selection - Grouped by Platform and Teacher - Radio buttons */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Rubric (optional)
            </label>
            <div className="border border-neutral-300 rounded-lg p-3 max-h-60 overflow-y-auto">
              <label className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded cursor-pointer mb-2">
                <input
                  type="radio"
                  name="rubric"
                  checked={newActivity.rubricId === ""}
                  onChange={() =>
                    setNewActivity((prev) => ({ ...prev, rubricId: "" }))
                  }
                  className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary"
                />
                <span className="text-sm">None</span>
              </label>

              {/* Platform Rubrics */}
              {rubrics.platform.length > 0 && (
                <div className="border-t border-neutral-200 pt-2 mt-2">
                  <div className="font-medium text-sm text-neutral-700 mb-2">
                    Platform Rubrics
                  </div>
                  <div className="ml-4 space-y-1">
                    {rubrics.platform.map((rubric) => (
                      <label
                        key={rubric.id}
                        className="flex items-center gap-2 p-1 hover:bg-neutral-50 rounded cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="rubric"
                          value={rubric.id}
                          checked={newActivity.rubricId === rubric.id}
                          onChange={(e) =>
                            setNewActivity((prev) => ({
                              ...prev,
                              rubricId: e.target.value,
                            }))
                          }
                          className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary"
                        />
                        <span className="text-sm">{rubric.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Teacher Rubrics */}
              {rubrics.teacher.length > 0 && (
                <div className="border-t border-neutral-200 pt-2 mt-2">
                  <div className="font-medium text-sm text-neutral-700 mb-2">
                    Your Rubrics
                  </div>
                  <div className="ml-4 space-y-1">
                    {rubrics.teacher.map((rubric) => (
                      <label
                        key={rubric.id}
                        className="flex items-center gap-2 p-1 hover:bg-neutral-50 rounded cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="rubric"
                          value={rubric.id}
                          checked={newActivity.rubricId === rubric.id}
                          onChange={(e) =>
                            setNewActivity((prev) => ({
                              ...prev,
                              rubricId: e.target.value,
                            }))
                          }
                          className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary"
                        />
                        <span className="text-sm">{rubric.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Due Date (optional)
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              value={newActivity.dueDate}
              onChange={(e) =>
                setNewActivity((prev) => ({
                  ...prev,
                  dueDate: e.target.value,
                }))
              }
            />
          </div>

          <Input
            label="Instructions (optional)"
            placeholder="Provide instructions for students..."
            type="textarea"
            rows={3}
            value={newActivity.description}
            onChange={(value) =>
              setNewActivity((prev) => ({ ...prev, description: value }))
            }
          />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={handleCreateActivity}
              disabled={!newActivity.title.trim() || isCreating}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isCreating ? "Creating..." : "Create Activity"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Programs Selection Modal */}
      <Modal
        isOpen={isProgramModalOpen}
        onClose={() => setIsProgramModalOpen(false)}
        title="Select Programs"
        size="md"
        contentClassName="flex flex-col overflow-hidden p-0"
      >
        <div className="flex flex-col flex-1 overflow-hidden px-6 pb-6">
          <div className="border border-neutral-300 rounded-lg p-3 flex-1 overflow-y-auto">
            <label className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={newActivity.programIds.length === 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setNewActivity((prev) => ({
                      ...prev,
                      programIds: [],
                      sectionIds: [], // Reset sections when selecting "all"
                    }));
                  }
                }}
                className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
              />
              <span className="text-sm font-medium">All Programs</span>
            </label>
            {programs.map((program) => (
              <label
                key={program.id}
                className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={newActivity.programIds.includes(program.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setNewActivity((prev) => ({
                        ...prev,
                        programIds: [...prev.programIds, program.id],
                      }));
                    } else {
                      setNewActivity((prev) => {
                        const newProgramIds = prev.programIds.filter(
                          (id) => id !== program.id
                        );
                        const newSectionIds = prev.sectionIds.filter(
                          (sectionId) => {
                            const section = sections.find(
                              (s) => s.id === sectionId
                            );
                            return section?.programId !== program.id;
                          }
                        );
                        return {
                          ...prev,
                          programIds: newProgramIds,
                          sectionIds: newSectionIds,
                        };
                      });
                    }
                  }}
                  className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
                />
                <span className="text-sm">{program.name}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsProgramModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sections Selection Modal */}
      <Modal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        title="Select Sections / Blocks"
        size="md"
        contentClassName="flex flex-col overflow-hidden p-0"
      >
        <div className="flex flex-col flex-1 overflow-hidden px-6 pb-6">
          <div className="border border-neutral-300 rounded-lg p-3 flex-1 overflow-y-auto">
            <label className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={newActivity.sectionIds.length === 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setNewActivity((prev) => ({ ...prev, sectionIds: [] }));
                  }
                }}
                className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
              />
              <span className="text-sm font-medium">All Sections</span>
            </label>
            <div className="border-t border-neutral-200 pt-2 space-y-3">
              {sectionsBySelectedPrograms.map(
                ({ program, sections: programSections }) => (
                  <div key={program.id}>
                    <div className="font-medium text-sm text-neutral-700 mb-2">
                      {program.name}
                    </div>
                    <div className="ml-4 space-y-1">
                      {programSections.map((section) => (
                        <label
                          key={section.id}
                          className="flex items-center gap-2 p-1 hover:bg-neutral-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={newActivity.sectionIds.includes(
                              section.id
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewActivity((prev) => ({
                                  ...prev,
                                  sectionIds: [...prev.sectionIds, section.id],
                                }));
                              } else {
                                setNewActivity((prev) => ({
                                  ...prev,
                                  sectionIds: prev.sectionIds.filter(
                                    (id) => id !== section.id
                                  ),
                                }));
                              }
                            }}
                            className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
                          />
                          <span className="text-sm">{section.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsSectionModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
