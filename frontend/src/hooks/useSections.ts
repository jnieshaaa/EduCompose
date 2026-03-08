import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Section } from "../types/academic";
import { supabase } from "../lib/supabaseClient";
import { useAlert } from "./useAlert";

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

export function useSections() {
  const [searchParams] = useSearchParams();
  const { showError, showSuccess, showWarning, AlertComponent } = useAlert();

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
  const [newSection, setNewSection] = useState({
    name: "",
    course_id: "",
    term: "",
    students: "0"
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const context = await getTeacherContext();
        if (!context) {
          setIsLoading(false);
          return;
        }

        // Load courses for the teacher's school/dept
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("id, course_code, course_title")
          .eq("school_id", context.school_id)
          .or(`department_id.eq.${context.department_id},department_id.is.null`);

        if (coursesError) throw coursesError;
        setAvailableCourses(coursesData || []);

        const courseIds = (coursesData || []).map(c => c.id);

        // Load sections for these courses
        const { data: sectionsData, error: sectionsError } = await supabase
          .from("sections")
          .select(`
            *,
            courses(course_code, course_title)
          `)
          .in("course_id", courseIds)
          .order("created_at", { ascending: false });

        if (sectionsError) throw sectionsError;
        setSections(sectionsData || []);
      } catch (error) {
        console.error("Error loading sections:", error);
        setLoadError("Unable to load blocks/sections.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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

    if (!newSection.name || !newSection.course_id || !newSection.term) {
      showError("Please fill in all required fields.");
      setIsCreatingSection(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("sections")
        .insert({
          course_id: newSection.course_id,
          name: newSection.name,
          term: newSection.term,
          students_estimated: parseInt(newSection.students, 10),
        })
        .select(`
          *,
          courses(course_code, course_title)
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          showError("This block already exists for this course and term.");
        } else {
          showError(`Failed to create block: ${error.message}`);
        }
        return;
      }

      setSections((prev) => [data, ...prev]);
      showSuccess("Block created successfully!");
      setIsAddDialogOpen(false);
      setNewSection({ name: "", course_id: "", term: "", students: "0" });
    } catch (err: any) {
      showError("An unexpected error occurred.");
    } finally {
      setIsCreatingSection(false);
    }
  };

  const handleDeleteSection = (section: any) => {
    showWarning(`Delete section "${section.name}"?`, {
      onConfirm: async () => {
        const { error } = await supabase.from("sections").delete().eq("id", section.id);
        if (!error) {
          setSections(prev => prev.filter(s => s.id !== section.id));
          showSuccess("Section deleted.");
        }
      }
    });
  };

  const handleUpdateSection = async () => {
    if (!editingSection) return;
    const { error } = await supabase
      .from("sections")
      .update({
        name: editingSection.name,
        term: editingSection.term,
        students_estimated: editingSection.students_estimated,
      })
      .eq("id", editingSection.id);

    if (!error) {
      setSections(prev => prev.map(s => s.id === editingSection.id ? { ...s, ...editingSection } : s));
      setIsEditDialogOpen(false);
      showSuccess("Section updated.");
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
    AlertComponent,
  };
}

