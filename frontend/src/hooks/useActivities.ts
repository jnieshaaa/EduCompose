import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
} from "../services/activityService";
import { useAcademicContext } from "./useAcademicContext";

export function useActivities(showArchived: boolean = false, ay?: string, term?: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentAY, currentSemester, isLoading: isLoadingAcademic } = useAcademicContext();

  const [activities, setActivities] = useState<EssayActivity[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<
    { id: string; name: string; courseId: string }[]
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
        const [activitiesData, coursesData, sectionsData, rubricsData] =
          await Promise.all([
            fetchTeacherActivities(
                ay || currentAY, 
                term || currentSemester, 
                showArchived
            ),
            fetchCourses().then(res => res.map(c => ({ id: c.id, name: c.course_code }))),
            fetchSections(),
            fetchRubrics(),
          ]);

        setActivities(activitiesData);
        setCourses(coursesData);
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
          courseId,
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
  }, [sectionId, courseId, activityId]);

  // Get current activity
  const currentActivity = activityId
    ? activities.find((a) => a.id === activityId)
    : null;

  // Generate course-sections for current activity
  const courseSections = useMemo(() => {
    if (!currentActivity) return [];

    const relevantSections = sections.filter(s => {
        if (currentActivity.courseId !== "all" && s.courseId !== currentActivity.courseId) return false;
        if (currentActivity.blockId !== "all" && s.id !== currentActivity.blockId) return false;
        return true;
    });

    return relevantSections.map((section) => {
      const course = courses.find(c => c.id === section.courseId);
      return {
        id: `${section.courseId}-${section.id}`,
        name: `${course?.name || 'Unknown'} - ${section.name}`,
        courseName: course?.name || 'Unknown',
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
    setSearchParams({
      activityId: id,
      activityTitle: activity?.title || "",
    });
  };

  const handleCourseSectionClick = (section: CourseSection) => {
    setSearchParams({
      activityId: activityId || "",
      sectionId: section.sectionId,
      courseId: section.courseId,
      courseName: section.courseName,
      courseSection: section.sectionName,
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
    courses,
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
  };
}

