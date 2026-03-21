import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type {
  EssayActivity,
  NewActivityForm,
  CourseSection,
  Student,
} from "../types/activityTypes";
import {
  fetchTeacherActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  fetchCourses,
  fetchSections,
  fetchRubrics,
  fetchStudentsByCourseAndSection,
  fetchTeacherProgramLoads,
} from "../services/activityService";
import { useAcademicContext } from "./useAcademicContext";

export function useActivities(showArchived: boolean = false, ay?: string, term?: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentAY, currentSemester, isLoading: isLoadingAcademic } = useAcademicContext();

  const [activities, setActivities] = useState<EssayActivity[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<
    { id: string; name: string; courseId: string; programLoadId: string }[]
  >([]);
  const [programLoads, setProgramLoads] = useState<
    { id: string; program_id: string; program_name: string; course_id: string }[]
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
  const sectionId = searchParams.get("sectionId");
  const courseId = searchParams.get("courseId");

  // Load activities, courses, sections, and rubrics from Supabase
  useEffect(() => {
    if (isLoadingAcademic) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [activitiesData, coursesData, programLoadsData, sectionsData, rubricsData] =
          await Promise.all([
            fetchTeacherActivities(
              ay || currentAY,
              term || currentSemester,
              showArchived,
            ),
            fetchCourses().then((res) =>
              res.map((c) => ({ id: c.id, name: c.course_code })),
            ),
            fetchTeacherProgramLoads(),
            fetchSections(),
            fetchRubrics(),
          ]);

        setActivities(activitiesData);
        setCourses(coursesData);
        setProgramLoads(programLoadsData);
        setSections(sectionsData);
        setRubrics(rubricsData);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isLoadingAcademic, currentAY, currentSemester, showArchived, ay, term]);

  // Fetch students for selected course-section
  useEffect(() => {
    if (!sectionId || !courseId) {
      setStudents([]);
      return;
    }

    const loadStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const studentsData = await fetchStudentsByCourseAndSection(
          sectionId,
          activityId || undefined
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

    // Subscribe to real-time changes on essays table
    const subscription = supabase
      .channel(`essays-changes-${sectionId}-${activityId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events
          schema: "public",
          table: "essays",
          // Filter by activity_id if possible, though multi-tenant isolation is usually enough
          filter: activityId ? `activity_id=eq.${activityId}` : undefined,
        },
        async (payload: any) => {
          console.log("[useActivities] Essay change detected:", payload);
          // Re-fetch students to get updated status and scores
          const updatedStudents = await fetchStudentsByCourseAndSection(
            sectionId,
            activityId || undefined
          );
          setStudents(updatedStudents);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sectionId, courseId, activityId]);

  const reloadStudents = async () => {
    if (!sectionId || !courseId) return;
    setIsLoadingStudents(true);
    try {
      const studentsData = await fetchStudentsByCourseAndSection(
        sectionId,
        activityId || undefined
      );
      setStudents(studentsData);
    } catch (err) {
      console.error("[useActivities] Error reloading students:", err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Get current activity
  const currentActivity = activityId
    ? activities.find((a) => a.id === activityId)
    : null;

  // Generate course-sections for current activity
  const courseSections = useMemo(() => {
    if (!currentActivity) return [];

    const relevantSections = sections.filter((s) => {
      // Check if this section is in the activity's selected blocks
      if (
        currentActivity.blockIds &&
        currentActivity.blockIds.length > 0 &&
        !currentActivity.blockIds.includes(s.id)
      ) {
        return false;
      }

      // Check if this section's course is in the activity's selected courses
      if (
        currentActivity.courseIds &&
        currentActivity.courseIds.length > 0 &&
        !currentActivity.courseIds.includes(s.courseId)
      ) {
        return false;
      }

      // Fallback to single IDs for backward compatibility
      if (
        currentActivity.courseId !== "all" &&
        s.courseId !== currentActivity.courseId &&
        (!currentActivity.courseIds || currentActivity.courseIds.length === 0)
      ) {
        return false;
      }

      if (
        currentActivity.blockId !== "all" &&
        s.id !== currentActivity.blockId &&
        (!currentActivity.blockIds || currentActivity.blockIds.length === 0)
      ) {
        return false;
      }

      return true;
    });

    return relevantSections.map((section) => {
      const course = courses.find((c) => c.id === section.courseId);
      return {
        id: `${section.courseId}-${section.id}`,
        name: section.name, // Display only the block name (e.g., "1A")
        courseName: course?.name || "Unknown",
        sectionName: section.name,
        courseId: section.courseId,
        sectionId: section.id,
        studentCount: 0,
        submissionCount: 0,
      };
    });
  }, [currentActivity, courses, sections]);

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
      const created = await createActivity({
        ...activity,
        academicYear: currentAY,
        term: currentSemester
      });
      setActivities((prev) => [...created, ...prev]);
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
      const currentActivity = activities.find(a => a.id === activityId);
      const updated = await updateActivity(activityId, {
        ...activity,
        academicYear: currentActivity?.academicYear || currentAY,
        term: currentActivity?.term || currentSemester
      });
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
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("activityId", id);
      if (activity?.title) {
        params.set("activityTitle", activity.title);
      }
      return params;
    });
  };

  const handleCourseSectionClick = (section: CourseSection) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("activityId", activityId || "");
      params.set("sectionId", section.sectionId);
      params.set("courseId", section.courseId);
      params.set("courseName", section.courseName);
      params.set("courseSection", section.sectionName);
      // Preservation of activityTitle is implicit if we use the functional update
      return params;
    });
  };

  const handleBackToSections = () => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete("sectionId");
      params.delete("courseId");
      params.delete("courseName");
      params.delete("courseSection");
      return params;
    });
  };

  const handleBackToActivities = () => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete("activityId");
      params.delete("activityTitle");
      params.delete("sectionId");
      params.delete("courseId");
      params.delete("courseName");
      params.delete("courseSection");
      return params;
    });
  };

  return {
    // State
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
    // Handlers
    handleCreateActivity,
    handleUpdateActivity,
    handleDeleteActivity,
    handleActivityClick,
    handleCourseSectionClick,
    handleBackToSections,
    handleBackToActivities,
    setSearchParams,
    reloadStudents,
  };
}

