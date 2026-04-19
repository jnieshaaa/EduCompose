import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAlert } from "./useAlert";
import type { Course } from "../types/academic";
import { useAcademicContext } from "./useAcademicContext";

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

export function useCourses(showArchived: boolean = false, ay?: string, term?: string, activeTab?: string) {
  const [searchParams] = useSearchParams();
  const { showError, showSuccess, showWarning, AlertComponent } = useAlert();
  const { currentAY, currentSemester, isLoading: isLoadingAcademic } = useAcademicContext();

  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [departmentCourses, setDepartmentCourses] = useState<Course[]>([]);
  const [schoolCourses, setSchoolCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  
  // New: Metadata for filters
  const [departments, setDepartments] = useState<any[]>([]);
  const [programsLookup, setProgramsLookup] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedProgId, setSelectedProgId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const fetchCourses = async () => {
    if (isLoadingAcademic) return;

    setIsLoading(true);
    setLoadError(null);
    try {
      const info = await getTeacherInfo();
      
      // Strict guard against missing school/auth data
      if (!info || !info.school_id || String(info.school_id) === "undefined") {
        console.warn("Teacher identity sync in progress or missing school_id...");
        setIsLoading(false);
        return;
      }

      setTeacherInfo(info);
      
      // Fetch metadata for filters if not already fetched
      if (departments.length === 0) {
        const { data: depts } = await supabase
          .from("departments")
          .select("id, name, code")
          .eq("school_id", info.school_id)
          .order("name");
        setDepartments(depts || []);
        
        if (depts && depts.length > 0) {
          const { data: progs } = await supabase
            .from("programs_lookup")
            .select("id, name, abbr, department_id")
            .in("department_id", depts.map(d => d.id))
            .order("name");
          setProgramsLookup(progs || []);
        }
      }

      // 1. Fetch Teacher's personal loads
      let myQuery = supabase
        .from("teacher_course_loads")
        .select(`
          course_id,
          academic_year,
          term,
          courses (
            id, school_id, course_code, course_title, units, department_id, program_id, user_id,
            departments(name, code),
            programs_lookup(name, abbr)
          )
        `)
        .eq("teacher_id", info.auth_user_id);

      if (!showArchived) {
        if (currentAY) myQuery = myQuery.eq("academic_year", currentAY);
        if (currentSemester) myQuery = myQuery.eq("term", currentSemester);
      }

      const { data: loadsData } = await myQuery;

      // 2. Fetch Department Courses (Broad)
      const { data: deptData } = await supabase
        .from("courses")
        .select(`
          *,
          departments(name, code),
          programs_lookup(name, abbr)
        `)
        .eq("school_id", info.school_id)
        .or(`department_id.eq.${info.department_id},department_id.is.null`)
        .order("course_code", { ascending: true });

      // 3. Fetch School Courses (Broad)
      const { data: schoolData } = await supabase
        .from("courses")
        .select(`
          *,
          departments(name, code),
          programs_lookup(name, abbr)
        `)
        .eq("school_id", info.school_id)
        .order("course_code", { ascending: true });

      const normalizeCourse = (c: any): Course => ({
        ...c,
        departments: Array.isArray(c.departments) ? c.departments[0] : c.departments,
        programs_lookup: Array.isArray(c.programs_lookup) ? c.programs_lookup[0] : c.programs_lookup
      });

      const userLoads = (loadsData || []).map(l => ({
        ...normalizeCourse(l.courses),
        academic_year: l.academic_year,
        term: l.term
      })) as unknown as Course[];
      setMyCourses(userLoads.filter(c => c && c.id));
      setDepartmentCourses(((deptData || []) as any[]).map(normalizeCourse) as unknown as Course[]);
      setSchoolCourses(((schoolData || []) as any[]).map(normalizeCourse) as unknown as Course[]);
    } catch (err) {
      console.error("Error loading courses:", err);
      setLoadError("Unable to load courses.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [isLoadingAcademic, currentAY, currentSemester, showArchived, ay, term]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDeptId, selectedProgId, activeTab]);

  const myLoadsIds = useMemo(() => new Set(myCourses.map(c => c.id)), [myCourses]);

  const filteredMyCourses = useMemo(() => {
    return myCourses.filter((course) => {
      const matchesSearch = !searchQuery || course.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.course_title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = !selectedDeptId || course.department_id === selectedDeptId;
      const matchesProg = !selectedProgId || course.program_id === selectedProgId;
      return matchesSearch && matchesDept && matchesProg;
    });
  }, [myCourses, searchQuery, selectedDeptId, selectedProgId]);

  const filteredDepartmentCourses = useMemo(() => {
    return departmentCourses.filter((course) => {
      const matchesSearch = !searchQuery || course.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.course_title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = !selectedDeptId || course.department_id === selectedDeptId;
      const matchesProg = !selectedProgId || course.program_id === selectedProgId;
      return matchesSearch && matchesDept && matchesProg;
    });
  }, [departmentCourses, searchQuery, selectedDeptId, selectedProgId]);

  const filteredSchoolCourses = useMemo(() => {
    return schoolCourses.filter((course) => {
      const matchesSearch = !searchQuery || course.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.course_title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = !selectedDeptId || course.department_id === selectedDeptId;
      const matchesProg = !selectedProgId || course.program_id === selectedProgId;
      return matchesSearch && matchesDept && matchesProg;
    });
  }, [schoolCourses, searchQuery, selectedDeptId, selectedProgId]);

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
            departments(name, code),
            programs_lookup(name, abbr)
          `)
        .single();

      if (error) throw error;

      const newCourse = data as unknown as Course;
      
      // Automatically add to loads with current AY and Term
      await supabase.from("teacher_course_loads").insert({
        teacher_id: teacherInfo.auth_user_id,
        course_id: newCourse.id,
        academic_year: currentAY,
        term: currentSemester
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

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const handleToggleLoad = async (courseId: string, isCurrentlyAdded: boolean) => {
    try {
      if (!teacherInfo || togglingIds.has(courseId)) return;
      
      setTogglingIds(prev => new Set(prev).add(courseId));

      if (isCurrentlyAdded) {
        const { error } = await supabase
          .from("teacher_course_loads")
          .delete()
          .eq("teacher_id", teacherInfo.auth_user_id)
          .eq("course_id", courseId)
          .eq("academic_year", currentAY)
          .eq("term", currentSemester);
        if (error) throw error;
        setMyCourses(prev => prev.filter(c => c.id !== courseId));
        showSuccess("Course removed from your current loads.");
      } else {
        // Find course in school catalog to check department
        const courseToAdd = schoolCourses.find(c => c.id === courseId);
        if (!courseToAdd) return;

        const isCrossDept = courseToAdd.department_id && teacherInfo.department_id && courseToAdd.department_id !== teacherInfo.department_id;

        const performAdd = async () => {
          const { error } = await supabase
            .from("teacher_course_loads")
            .insert({
              teacher_id: teacherInfo.auth_user_id,
              course_id: courseId,
              academic_year: currentAY,
              term: currentSemester
            });
          if (error) throw error;
          
          setMyCourses(prev => [courseToAdd, ...prev]);
          showSuccess("Course added to your current loads!");
        };

        if (isCrossDept) {
          showWarning(`This course belongs to another department (${courseToAdd.departments?.name || "Other"}). Are you sure you want to add this to your load?`, {
            title: "Cross-Department Assignment",
            showCancel: true,
            confirmText: "Yes, Add Course",
            onConfirm: performAdd
          });
        } else {
          await performAdd();
        }
      }
    } catch (err: any) {
      console.error("Error toggling load:", err);
      showError(`Operation failed: ${err.message}`);
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
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
    selectedDeptId,
    setSelectedDeptId,
    selectedProgId,
    setSelectedProgId,
    departments,
    programsLookup,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isCreating,
    handleCreateCourse,
    handleDeleteCourse,
    handleToggleLoad,
    togglingIds,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    AlertComponent,
  };
}

