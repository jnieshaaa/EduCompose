import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  EssayActivity,
  NewActivityForm,
  ProgramSection,
  Student,
} from "../types/activityTypes";
import {
  fetchTeacherActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  fetchPrograms,
  fetchSections,
  fetchRubrics,
  fetchStudentsByProgramAndSection,
} from "../services/activityService";

export function useActivities() {
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
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // URL params
  const activityId = searchParams.get("activityId");
  const programSection = searchParams.get("programSection");
  const programName = searchParams.get("programName");

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

  // Fetch students for selected program-section
  useEffect(() => {
    if (!programSection || !programName) {
      console.log(
        "[useActivities] Missing programSection or programName, clearing students"
      );
      setStudents([]);
      return;
    }

    const loadStudents = async () => {
      console.log(
        `[useActivities] Loading students for program: "${programName}", section: "${programSection}", activityId: ${activityId}`
      );
      setIsLoadingStudents(true);
      try {
        const studentsData = await fetchStudentsByProgramAndSection(
          programName,
          programSection,
          activityId || undefined
        );
        console.log(
          `[useActivities] Loaded ${studentsData.length} students`,
          studentsData
        );
        setStudents(studentsData);
      } catch (err) {
        console.error("[useActivities] Error loading students:", err);
        setStudents([]);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    loadStudents();
  }, [programSection, programName, activityId]);

  // Get current activity
  const currentActivity = activityId
    ? activities.find((a) => a.id === activityId)
    : null;

  // Generate program-sections for current activity
  const programSections = useMemo(() => {
    if (!currentActivity) return [];

    if (currentActivity.programId === "all") {
      return programs.flatMap((program) => {
        const programSections = sections.filter(
          (s) => s.programId === program.id
        );
        return programSections.map((section) => ({
          id: `${program.id}-${section.id}`,
          name: `${program.name} - ${section.name}`,
          programName: program.name,
          sectionName: section.name,
          studentCount: 0,
          submissionCount: 0,
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
        studentCount: 0,
        submissionCount: 0,
      }));
    }
  }, [currentActivity, programs, sections]);

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

  // Handlers
  const handleCreateActivity = async (activity: NewActivityForm) => {
    setIsCreating(true);
    try {
      const created = await createActivity(activity);
      setActivities((prev) => [created, ...prev]);
    } catch (err) {
      console.error("Error creating activity:", err);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateActivity = async (
    activityId: string,
    activity: NewActivityForm
  ) => {
    setIsCreating(true);
    try {
      const updated = await updateActivity(activityId, activity);
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? updated : a))
      );
    } catch (err) {
      console.error("Error updating activity:", err);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      await deleteActivity(activityId);
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
      if (searchParams.get("activityId") === activityId) {
        setSearchParams({});
      }
    } catch (err) {
      console.error("Error deleting activity:", err);
      throw err;
    }
  };

  const handleActivityClick = (id: string) => {
    const activity = activities.find((a) => a.id === id);
    setSearchParams({
      activityId: id,
      activityTitle: activity?.title || "",
    });
  };

  const handleProgramSectionClick = (section: ProgramSection) => {
    setSearchParams({
      activityId: activityId || "",
      activityTitle: currentActivity?.title || "",
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

  return {
    // State
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
    // Handlers
    handleCreateActivity,
    handleUpdateActivity,
    handleDeleteActivity,
    handleActivityClick,
    handleProgramSectionClick,
    handleBackToSections,
    handleBackToActivities,
    setSearchParams,
  };
}
