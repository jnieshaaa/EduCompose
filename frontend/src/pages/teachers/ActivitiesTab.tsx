import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ActivitiesListView } from "../../components/activities/ActivitiesListView";
import { ProgramSectionsView } from "../../components/activities/ProgramSectionsView";
import { StudentsView } from "../../components/activities/StudentsView";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Plus } from "lucide-react";
import type { EssayActivity, NewActivityForm } from "../../types/activityTypes";
import {
  initialActivities,
  demoPrograms,
  demoBlocks,
  demoRubrics,
  generateProgramSections,
  generateStudents,
} from "../../data/activityData";
import type { ProgramSection } from "../../types/activityTypes";

export function ActivitiesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activities, setActivities] =
    useState<EssayActivity[]>(initialActivities);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Get current view state from URL params
  const activityId = searchParams.get("activityId");
  const programSection = searchParams.get("programSection");
  const programName = searchParams.get("programName");

  const [newActivity, setNewActivity] = useState<NewActivityForm>({
    title: "",
    programId: "all",
    blockId: "all",
    rubricId: "",
    dueDate: "",
    description: "",
  });

  // Get current activity
  const currentActivity = activityId
    ? activities.find((a) => a.id === activityId)
    : null;

  // Get program-sections for current activity
  const programSections = useMemo(() => {
    if (!currentActivity) return [];

    if (currentActivity.programId === "all") {
      // Show all programs with their sections
      return demoPrograms.flatMap((program) =>
        generateProgramSections(program.name)
      );
    } else {
      const program = demoPrograms.find(
        (p) => p.id === currentActivity.programId
      );
      if (!program) return [];
      return generateProgramSections(program.name);
    }
  }, [currentActivity]);

  // Get students for selected program-section
  const students = useMemo(() => {
    const sectionParam = searchParams.get("programSection");
    if (!sectionParam) return [];
    return generateStudents(sectionParam);
  }, [searchParams]);

  const filteredBlocks = useMemo(
    () =>
      newActivity.programId === "all"
        ? demoBlocks
        : demoBlocks.filter((b) => b.programId === newActivity.programId),
    [newActivity.programId]
  );

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
  const handleCreateActivity = () => {
    if (!newActivity.title.trim()) return;

    const id = `activity-${Date.now()}`;
    const activity: EssayActivity = {
      id,
      title: newActivity.title.trim(),
      programId: newActivity.programId,
      blockId: newActivity.blockId,
      rubricId: newActivity.rubricId || null,
      dueDate: newActivity.dueDate || undefined,
      description: newActivity.description || undefined,
      createdAt: new Date().toISOString().split("T")[0],
      submissionCount: 0,
    };

    setActivities((prev) => [activity, ...prev]);
    setNewActivity({
      title: "",
      programId: "all",
      blockId: "all",
      rubricId: "",
      dueDate: "",
      description: "",
    });
    setIsCreateModalOpen(false);
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

  const handleDeleteActivity = (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation();
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
    if (searchParams.get("activityId") === activityId) {
      setSearchParams({});
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
      />
    );
  }

  // Render default activities list view
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Program
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm"
                value={newActivity.programId}
                onChange={(e) =>
                  setNewActivity((prev) => ({
                    ...prev,
                    programId: e.target.value as "all" | string,
                    blockId: "all",
                  }))
                }
              >
                <option value="all">All Programs</option>
                {demoPrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Section / Block
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm"
                value={newActivity.blockId}
                onChange={(e) =>
                  setNewActivity((prev) => ({
                    ...prev,
                    blockId: e.target.value as "all" | string,
                  }))
                }
              >
                <option value="all">All Sections</option>
                {filteredBlocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Rubric
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm"
                value={newActivity.rubricId}
                onChange={(e) =>
                  setNewActivity((prev) => ({
                    ...prev,
                    rubricId: e.target.value,
                  }))
                }
              >
                <option value="">Select rubric (optional)</option>
                {demoRubrics.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Due Date (optional)
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm"
                value={newActivity.dueDate}
                onChange={(e) =>
                  setNewActivity((prev) => ({
                    ...prev,
                    dueDate: e.target.value,
                  }))
                }
              />
            </div>
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
              disabled={!newActivity.title.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Activity
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
