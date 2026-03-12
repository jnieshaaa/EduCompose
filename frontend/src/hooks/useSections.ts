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

  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  const [newSection, setNewSection] = useState({
    name: "",
    course_id: "",
    program_id: "",
    year_level: 1,
    term: "",
    students: "0"
  });

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

        // 1. Fetch Teacher's personal course loads with linked blocks
        const { data: loadsData, error: loadsError } = await supabase
          .from("teacher_course_loads")
          .select(`
            id,
            course_id,
            academic_year,
            term,
            block_id,
            blocks (
              id,
              name,
              year_level,
              program_id
            ),
            courses (id, course_code, course_title)
          `)
          .eq("teacher_id", context.auth_user_id)
          .eq("academic_year", ay || currentAY)
          .eq("term", term || currentSemester);

        if (loadsError) throw loadsError;

        // Filter out loads that don't have a block assigned if we only want assigned sections
        const assignedLoads = (loadsData || []).filter(l => l.block_id !== null);

        const availableCoursesList = (loadsData || [])
          .map(l => l.courses)
          .filter((c): c is any => c !== null);
          
        // Ensure unique courses
        const uniqueCourses = Array.from(new Map(availableCoursesList.map(c => [c.id, c])).values());
        setAvailableCourses(uniqueCourses);

        // 2. Fetch all programs for the add section modal
        const { data: programsData, error: programsError } = await supabase
          .from("programs_lookup")
          .select("id, name, abbreviation")
          .order("name", { ascending: true });

        if (!programsError) {
          setAllPrograms(programsData || []);
        }


        // Map teacher_course_loads to the Section interface for frontend compatibility
        const mappedSections: Section[] = assignedLoads.map(load => {
          const blocksAny = load.blocks as any;
          const coursesAny = load.courses as any;
          
          return {
            id: load.id, // Use the load ID as the section ID
            course_id: load.course_id,
            block_id: load.block_id,
            name: blocksAny.name,
            year_level: blocksAny.year_level,
            term: load.term,
            academic_year: load.academic_year,
            students_estimated: 0, 
            essays_estimated: 0,
            created_at: "", 
            courses: coursesAny
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
      const courseMatch = section.courses?.course_code || "";
      const matchesSearch =
        section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        courseMatch.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.term.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCourse =
        courseFilter === "All Courses" || section.course_id === courseFilter;
      const matchesTerm =
        termFilter === "All Terms" || section.term === termFilter;

      return matchesSearch && matchesCourse && matchesTerm;
    });
  }, [sections, searchQuery, courseFilter, termFilter]);

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

      // 1. Get the teacher's load ID for this course/AY/term
      const { data: loadData, error: loadError } = await supabase
        .from("teacher_course_loads")
        .select("id, block_id")
        .eq("teacher_id", context.auth_user_id)
        .eq("course_id", newSection.course_id)
        .eq("academic_year", currentAY)
        .eq("term", newSection.term || currentSemester)
        .single();

      if (loadError || !loadData) throw new Error("Course load not found for this term.");
      
      // If load already has a block, we might want to update it or prevent
      if (loadData.block_id) {
        showWarning("This course load already has a block assigned. Close this and use Edit if you want to change it.");
        setIsCreatingSection(false);
        return;
      }

      // 2. Check if the block already exists (shared across teachers)
      let { data: blockData } = await supabase
        .from("blocks")
        .select("id, name, program_id, year_level")
        .eq("name", newSection.name)
        .eq("program_id", newSection.program_id)
        .eq("year_level", newSection.year_level)
        .maybeSingle();

      // 3. If block doesn't exist, create it
      if (!blockData) {
        const { data: newBlock, error: createBlockError } = await supabase
          .from("blocks")
          .insert({
            name: newSection.name,
            program_id: newSection.program_id,
            year_level: newSection.year_level,
          })
          .select()
          .single();

        if (createBlockError) throw createBlockError;
        blockData = newBlock;
      }

      // 4. Update the teacher_course_load with the block_id
      if (!blockData) throw new Error("Could not find or create block.");

      const { data: updatedLoad, error: updateError } = await supabase
        .from("teacher_course_loads")
        .update({
          block_id: blockData.id,
        })
        .eq("id", loadData.id)
        .select(`
          id,
          course_id,
          academic_year,
          term,
          block_id,
          blocks (*),
          courses (id, course_code, course_title)
        `)
        .single();

      if (updateError) throw updateError;
      if (!updatedLoad) throw new Error("Failed to update course load with block.");

      // 5. Update UI
      const blocksAny = updatedLoad.blocks as any;
      const coursesAny = updatedLoad.courses as any;

      const newMappedSection: Section = {
        id: updatedLoad.id,
        course_id: updatedLoad.course_id,
        block_id: updatedLoad.block_id,
        name: blocksAny.name,
        year_level: blocksAny.year_level,
        term: updatedLoad.term,
        academic_year: updatedLoad.academic_year,
        students_estimated: 0,
        essays_estimated: 0,
        created_at: new Date().toISOString(),
        courses: coursesAny
      };

      setSections((prev) => [newMappedSection, ...prev]);
      showSuccess("Block assigned to course load successfully!");
      setIsAddDialogOpen(false);
      setNewSection({ 
        name: "", 
        course_id: "", 
        program_id: "", 
        year_level: 1, 
        term: currentSemester, 
        students: "0" 
      });
    } catch (err: any) {
      console.error("Error setting block assignment:", err);
      showError(err.message || "An unexpected error occurred.");
    } finally {
      setIsCreatingSection(false);
    }
  };

  const handleDeleteSection = (section: any) => {
    showWarning(`Unassign block "${section.name}" from this course load?`, {
      onConfirm: async () => {
        // We set block_id to null in teacher_course_loads
        const { error } = await supabase
          .from("teacher_course_loads")
          .update({ block_id: null })
          .eq("id", section.id);
          
        if (!error) {
          setSections(prev => prev.filter(s => s.id !== section.id));
          showSuccess("Block unassigned.");
        } else {
          showError("Failed to unassign block.");
        }
      }
    });
  };

  const handleUpdateSection = async () => {
    if (!editingSection || !editingSection.blocks) return;
    const { error } = await supabase
      .from("blocks")
      .update({
        name: editingSection.name,
        year_level: editingSection.year_level,
      })
      .eq("id", editingSection.blocks.id);

    if (!error) {
      setSections(prev => prev.map(s => s.id === editingSection.id ? { ...s, ...editingSection } : s));
      setIsEditDialogOpen(false);
      showSuccess("Block updated.");
    } else {
      showError("Failed to update block.");
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
    allPrograms,
    handleCreateSection,
    handleDeleteSection,
    handleUpdateSection,
    AlertComponent,
  };
}

