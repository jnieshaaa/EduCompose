import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAlert } from "./useAlert";
import type { Course } from "../types/academic";

// Helper to get teacher's school and department from public.users
const getTeacherInfo = async () => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data: userData, error: userTableError } = await supabase
      .from("users")
      .select(`
        auth_user_id, 
        school_id, 
        department_id,
        schools (
          name,
          code
        )
      `)
      .eq("auth_user_id", user.id)
      .single();

    if (userTableError || !userData) return null;
    return userData;
  } catch (err) {
    console.error("Unexpected error fetching teacher info:", err);
    return null;
  }
};

export function useCourses() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showError, showSuccess, showWarning, AlertComponent } = useAlert();

  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [departmentCourses, setDepartmentCourses] = useState<Course[]>([]);
  const [schoolCourses, setSchoolCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);

  const fetchCourses = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const info = await getTeacherInfo();
      if (!info || !info.school_id) {
        setIsLoading(false);
        return;
      }
      setTeacherInfo(info);

      // 1. Fetch Teacher's personal loads from teacher_course_loads
      const { data: loadsData, error: loadsError } = await supabase
        .from("teacher_course_loads")
        .select(`
          course_id,
          courses (
            *,
            schools(name),
            departments(name),
            programs_lookup(name)
          )
        `)
        .eq("teacher_id", info.auth_user_id);

      if (loadsError) throw loadsError;

      // 2. Fetch Department Courses (Self + Dept + General)
      const { data: deptData, error: deptError } = await supabase
        .from("courses")
        .select(`
          *,
          schools(name),
          departments(name),
          programs_lookup(name)
        `)
        .eq("school_id", info.school_id)
        .or(`department_id.eq.${info.department_id},department_id.is.null`)
        .order("course_code", { ascending: true });

      if (deptError) throw deptError;

      // 3. Fetch All School Courses
      const { data: schoolData, error: schoolError } = await supabase
        .from("courses")
        .select(`
          *,
          schools(name),
          departments(name),
          programs_lookup(name)
        `)
        .eq("school_id", info.school_id)
        .order("course_code", { ascending: true });

      if (schoolError) throw schoolError;

      const userLoads = (loadsData || []).map(l => l.courses) as unknown as Course[];
      setMyCourses(userLoads.filter(c => c !== null));
      setDepartmentCourses((deptData as unknown as Course[]) || []);
      setSchoolCourses((schoolData as unknown as Course[]) || []);
    } catch (err) {
      console.error("Error loading courses:", err);
      setLoadError("Unable to load courses.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const myLoadsIds = useMemo(() => new Set(myCourses.map(c => c.id)), [myCourses]);

  const filteredMyCourses = useMemo(() => {
    return myCourses.filter((course) =>
      course.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.course_title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [myCourses, searchQuery]);

  const filteredDepartmentCourses = useMemo(() => {
    return departmentCourses.filter((course) =>
      course.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.course_title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [departmentCourses, searchQuery]);

  const filteredSchoolCourses = useMemo(() => {
    return schoolCourses.filter((course) =>
      course.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.course_title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [schoolCourses, searchQuery]);

  const handleCreateCourse = async (courseData: Partial<Course>) => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      if (!teacherInfo) throw new Error("Teacher info not found");

      const { data, error } = await supabase
        .from("courses")
        .insert({
          ...courseData,
          school_id: teacherInfo.school_id,
          user_id: teacherInfo.auth_user_id,
          department_id: teacherInfo.department_id,
          department: courseData.department || null,
        })
        .select(`
            *,
            schools(name),
            departments(name),
            programs_lookup(name)
          `)
        .single();

      if (error) throw error;

      const newCourse = data as unknown as Course;
      
      // Automatically add to loads
      await supabase.from("teacher_course_loads").insert({
        teacher_id: teacherInfo.auth_user_id,
        course_id: newCourse.id
      });

      setMyCourses((prev) => [newCourse, ...prev]);
      setDepartmentCourses((prev) => [newCourse, ...prev]);
      setSchoolCourses((prev) => [newCourse, ...prev]);
      showSuccess("Course created and added to your loads!");
      setIsAddDialogOpen(false);
    } catch (err: any) {
      console.error("Error creating course:", err);
      showError(`Failed to create course: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleLoad = async (courseId: string, isCurrentlyAdded: boolean) => {
    try {
      if (!teacherInfo) return;
      
      if (isCurrentlyAdded) {
        const { error } = await supabase
          .from("teacher_course_loads")
          .delete()
          .eq("teacher_id", teacherInfo.auth_user_id)
          .eq("course_id", courseId);
        if (error) throw error;
        setMyCourses(prev => prev.filter(c => c.id !== courseId));
        showSuccess("Course removed from your loads.");
      } else {
        const { error } = await supabase
          .from("teacher_course_loads")
          .insert({
            teacher_id: teacherInfo.auth_user_id,
            course_id: courseId
          });
        if (error) throw error;
        
        // Find course in school catalog to add to state
        const courseToAdd = schoolCourses.find(c => c.id === courseId);
        if (courseToAdd) {
            setMyCourses(prev => [courseToAdd, ...prev]);
        } else {
            // Fallback: refetch
            fetchCourses();
        }
        showSuccess("Course added to your loads!");
      }
    } catch (err: any) {
      console.error("Error toggling load:", err);
      showError(`Operation failed: ${err.message}`);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    showWarning("Are you sure you want to delete this course from the system?", {
      title: "Delete Course",
      showCancel: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("courses").delete().eq("id", courseId);
          if (error) throw error;
          setMyCourses((prev) => prev.filter((c) => c.id !== courseId));
          setDepartmentCourses((prev) => prev.filter((c) => c.id !== courseId));
          setSchoolCourses((prev) => prev.filter((c) => c.id !== courseId));
          showSuccess("Course deleted successfully!");
        } catch (err: any) {
          showError(`Failed to delete course: ${err.message}`);
        }
      }
    });
  };

  return {
    teacherInfo,
    myCourses: filteredMyCourses,
    departmentCourses: filteredDepartmentCourses,
    schoolCourses: filteredSchoolCourses,
    myLoadsIds,
    isLoading,
    loadError,
    searchQuery,
    setSearchQuery,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isCreating,
    handleCreateCourse,
    handleDeleteCourse,
    handleToggleLoad,
    AlertComponent,
  };
}

