import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Section } from "../types/academic";
import { supabase } from "../lib/supabaseClient";
import { useAlert } from "./useAlert";
import { useAcademicContext } from "./useAcademicContext";

// Helper to get user ID and academic context
const getTeacherContext = async () => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data: userData, error: userTableError } = await supabase
      .from("users")
      .select("id, auth_user_id, school_id, department_id")
      .eq("auth_user_id", user.id)
      .single();

    if (userTableError || !userData) return null;
    return userData;
  } catch (err) {
    console.error("Unexpected error fetching teacher context:", err);
    return null;
  }
};

export function useSections(showArchived: boolean = false, ay?: string, term?: string) {
  const [searchParams] = useSearchParams();
  const { showError, showSuccess, showWarning, AlertComponent } = useAlert();
  const { currentAY, currentSemester, isLoading: isLoadingAcademic } = useAcademicContext();

  const urlCourseFilter = searchParams.get("course");
  const urlSearchQuery = searchParams.get("search");

  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery || "");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [courseFilter, setCourseFilter] = useState(urlCourseFilter || "All Courses");
  const [termFilter, setTermFilter] = useState("All Terms");
  const [allPrograms, setAllPrograms] = useState<any[]>([]);

  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [newSection, setNewSection] = useState({
    name: "", // Block Name (A, B, C)
    course_id: "",
    program_id: "",
    year: 1, // Year (1-5)
    term: "",
    students: "0"
  });
  const [programWideBlocks, setProgramWideBlocks] = useState<{year: number, name: string, student_count: number}[]>([]);

  // Update new section term when academic context loads
  useEffect(() => {
    if (currentSemester) {
      setNewSection(prev => ({ ...prev, term: currentSemester }));
    }
  }, [currentSemester]);

  useEffect(() => {
    if (isLoadingAcademic) return;

    const fetchData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const context = await getTeacherContext();
        if (!context) {
          setIsLoading(false);
          return;
        }

        // 1. Fetch blocks through teacher_program_loads hierarchy
        const targetAY = ay || currentAY;
        const targetTerm = term || currentSemester;

        let query = supabase
          .from("blocks")
          .select(`
            id,
            name,
            year,
            program_load_id,
            teacher_program_loads!inner (
              id,
              course_load_id,
              program_id,
              teacher_course_loads!inner (
                id,
                course_id,
                teacher_id,
                academic_year,
                term,
                courses (id, course_code, course_title)
              ),
              programs_lookup (id, name, abbr)
            )
          `)
          .eq("teacher_program_loads.teacher_course_loads.teacher_id", context.auth_user_id);

        if (targetAY) {
          query = query.eq("teacher_program_loads.teacher_course_loads.academic_year", targetAY);
        }
        if (targetTerm) {
          query = query.eq("teacher_program_loads.teacher_course_loads.term", targetTerm);
        }

        const { data: blocksData, error: blocksError } = await query;

        if (blocksError) throw blocksError;

        // Fetch available courses for this teacher in the CURRENT term
        const { data: loadsData } = await supabase
          .from("teacher_course_loads")
          .select("courses(id, course_code, course_title)")
          .eq("teacher_id", context.auth_user_id)
          .eq("academic_year", currentAY)
          .eq("term", currentSemester);

        const availableCoursesList = (loadsData || [])
          .map(l => l.courses)
          .filter((c): c is any => c !== null);
          
        const uniqueCourses = Array.from(new Map(availableCoursesList.map(c => [c.id, c])).values());
        setAvailableCourses(uniqueCourses);

        // Fetch all programs for assignment
        const { data: programsData } = await supabase
          .from("programs_lookup")
          .select("*")
          .order("name");
        
        setAllPrograms(programsData || []);

        // Map blocks to the Section interface for frontend compatibility
        const mappedSections: Section[] = (blocksData as any[] || []).map(b => {
          const tpl = b.teacher_program_loads as any;
          const tcl = tpl.teacher_course_loads as any;
          const courseData = tcl.courses as any;
          const programData = tpl.programs_lookup as any;
          
          return {
            id: b.id, 
            course_id: tcl.course_id,
            block_id: b.id,
            name: b.name,
            year: b.year,
            program_id: tpl.program_id,
            program_load_id: tpl.id,
            students_estimated: 0, 
            essays_estimated: 0,
            created_at: (b as any).created_at || "", 
            courses: courseData,
            program_abbr: programData?.abbr,
            academic_year: tcl.academic_year,
            term: tcl.term
          };
        });

        setSections(mappedSections);
      } catch (error) {
        console.error("Error loading sections:", error);
        setLoadError("Unable to load blocks.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isLoadingAcademic, currentAY, currentSemester, showArchived, ay, term]);

  const filteredSections = useMemo(() => {
    return sections.filter((section) => {
      const courseMatch = (section as any).courses?.course_code || "";
      const matchesSearch =
        section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        courseMatch.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCourse =
        courseFilter === "All Courses" || section.course_id === courseFilter;

      return matchesSearch && matchesCourse;
    });
  }, [sections, searchQuery, courseFilter]);

  const handleCreateSection = async () => {
    if (isCreatingSection) return;
    setIsCreatingSection(true);

    if (!newSection.name || !newSection.course_id || !newSection.program_id) {
      showError("Please fill in all required fields.");
      setIsCreatingSection(false);
      return;
    }

    try {
      const context = await getTeacherContext();
      if (!context) throw new Error("Teacher context not found");

      // 1. Get the teacher's load ID for this course in the CURRENT term
      const { data: loadData, error: loadError } = await supabase
        .from("teacher_course_loads")
        .select("id")
        .eq("teacher_id", context.auth_user_id)
        .eq("course_id", newSection.course_id)
        .eq("academic_year", currentAY)
        .eq("term", currentSemester)
        .maybeSingle();

      if (loadError || !loadData) throw new Error("Course load not found. Add this course to your load first.");
      
      // 2. Ensure teacher_program_load exists
      let { data: tplData } = await supabase
        .from("teacher_program_loads")
        .select("id")
        .eq("course_load_id", loadData.id)
        .eq("program_id", newSection.program_id)
        .maybeSingle();

      if (!tplData) {
        const { data: newTpl, error: createTplError } = await supabase
          .from("teacher_program_loads")
          .insert({
            course_load_id: loadData.id,
            program_id: newSection.program_id
          })
          .select()
          .single();
        
        if (createTplError) throw createTplError;
        tplData = newTpl;
      }
      
      if (!tplData) throw new Error("Failed to create program load.");

      // 3. Create the block
      const { data: blockData, error: createBlockError } = await supabase
        .from("blocks")
        .insert({
          program_load_id: tplData.id,
          year: newSection.year,
          name: newSection.name.toUpperCase(),
          teacher_id: context.auth_user_id
        })
        .select(`
          id,
          name,
          year,
          created_at,
          teacher_program_loads (
            id,
            program_id,
            teacher_course_loads (
              id,
              course_id,
              courses (*)
            ),
            programs_lookup (*)
          )
        `)
        .single();

      if (createBlockError) {
        if (createBlockError.code === "23505") {
          throw new Error("A block with this year and name already exists for this program.");
        }
        throw createBlockError;
      }

      let enrollmentCount = 0;
      // 4. Automatically link existing students
      if (blockData) {
        const { data: matchingStudents } = await supabase
          .from("students")
          .select("id")
          .eq("program_id", newSection.program_id)
          .eq("year", newSection.year)
          .eq("block_name", newSection.name.toUpperCase());

        if (matchingStudents && matchingStudents.length > 0) {
          enrollmentCount = matchingStudents.length;
          const enrollments = matchingStudents.map(s => ({
            block_id: blockData.id,
            student_id: s.id
          }));
          
          await supabase.from("block_students").insert(enrollments);
        }
      }

      // 5. Update UI
      const tpl = blockData.teacher_program_loads as any;
      const tcl = tpl.teacher_course_loads as any;
      const courseData = tcl.courses as any;
      const progData = tpl.programs_lookup as any;

      const newMappedSection: Section = {
        id: blockData.id,
        course_id: tcl.course_id,
        block_id: blockData.id,
        name: blockData.name,
        year: blockData.year,
        program_id: tpl.program_id,
        program_load_id: tpl.id,
        students_estimated: 0,
        essays_estimated: 0,
        created_at: blockData.created_at || new Date().toISOString(),
        // @ts-ignore
        courses: courseData,
        program_abbr: progData?.abbr
      };

      setSections((prev) => [newMappedSection, ...prev]);
      showSuccess(`Block created successfully! ${enrollmentCount > 0 ? `${enrollmentCount} students auto-enrolled.` : "No matching students found for auto-enroll."}`);
      setIsAddDialogOpen(false);
      setNewSection({ 
        name: "", 
        course_id: "", 
        program_id: "", 
        year: 1, 
        term: currentSemester, 
        students: "0" 
      });
    } catch (err: any) {
      console.error("Error creating block:", err);
      showError(err.message || "An unexpected error occurred.");
    } finally {
      setIsCreatingSection(false);
    }
  };

  const handleDeleteSection = (section: any) => {
    showWarning(`Delete block "${section.name}"? This will unassign all linked students.`, {
      onConfirm: async () => {
        const { error } = await supabase
          .from("blocks")
          .delete()
          .eq("id", section.id);
          
        if (!error) {
          setSections(prev => prev.filter(s => s.id !== section.id));
          showSuccess("Block deleted.");
        } else {
          showError("Failed to delete block.");
        }
      }
    });
  };

  const handleUpdateSection = async () => {
    if (!editingSection) return;
    const { error } = await supabase
      .from("blocks")
      .update({
        name: editingSection.name,
        year: editingSection.year,
      })
      .eq("id", editingSection.id);

    if (!error) {
      setSections(prev => prev.map(s => s.id === editingSection.id ? { ...s, ...editingSection } : s));
      setIsEditDialogOpen(false);
      showSuccess("Block updated.");
    } else {
      showError("Failed to update block.");
    }
  };

  const fetchProgramWideBlocks = async (programId: string) => {
    if (!programId) {
      setProgramWideBlocks([]);
      return;
    }
    try {
      // 1. Get all blocks in this program
      const { data: blocks } = await supabase
        .from("blocks")
        .select("year, name, teacher_program_loads!inner(program_id)")
        .eq("teacher_program_loads.program_id", programId);
      
      if (!blocks) return;

      // 2. Map unique blocks and fetch student counts for each
      const uniqueBlocks = blocks.reduce((acc: any[], current: any) => {
        const exists = acc.find(item => item.name === current.name && item.year === current.year);
        if (!exists) acc.push({ name: current.name, year: current.year });
        return acc;
      }, []);

      const results = await Promise.all(uniqueBlocks.map(async (b) => {
        const { count } = await supabase
          .from("students")
          .select("*", { count: 'exact', head: true })
          .eq("program_id", programId)
          .eq("year", b.year)
          .eq("block_name", b.name);
        return { ...b, student_count: count || 0 };
      }));

      setProgramWideBlocks(results);
    } catch (err) {
      console.error("Error fetching program blocks:", err);
    }
  };

  return {
    sections: filteredSections,
    allSections: sections,
    isLoading,
    loadError,
    searchQuery,
    setSearchQuery,
    courseFilter,
    setCourseFilter,
    termFilter,
    setTermFilter,
    isAddDialogOpen,
    setIsAddDialogOpen,
    newSection,
    setNewSection,
    isCreatingSection,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editingSection,
    setEditingSection,
    availableCourses,
    handleCreateSection,
    handleDeleteSection,
    handleUpdateSection,
    allPrograms,
    programWideBlocks,
    fetchProgramWideBlocks,
    AlertComponent,
  };
}

