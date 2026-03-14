import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAlert } from "./useAlert";
import type { Student, Program, Section } from "../types/academic";
import { authApi } from "../api";
import { sendStudentWelcomeEmail } from "../services/emailService";

export function useStudents(blockId?: string, ay?: string, term?: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { showSuccess, showError, showWarning, AlertComponent } = useAlert();

  // Filters for StudentsTab
  const [programFilter, setProgramFilter] = useState("All Programs");
  const [sectionFilter, setSectionFilter] = useState("All Sections");

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Catalogs for filters
  const [availablePrograms, setAvailablePrograms] = useState<Program[]>([]);
  const [availableSections, setAvailableSections] = useState<Section[]>([]);

  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    student_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
  });

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      let query = supabase
        .from("students")
        .select(`
          *,
          block_students (
            block_id,
            blocks (
              id,
              name,
              teacher_program_loads (
                teacher_course_loads (
                  academic_year,
                  term
                )
              )
            )
          )
        `)
        .eq("teacher_id", userData.user.id);

      if (blockId) {
        // Filter by specific block
        query = query.filter("block_students.block_id", "eq", blockId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let result = data || [];

      // Manual filtering for AY and Term since it's deep in the join
      if (ay && ay !== "all") {
        result = result.filter(s => 
          s.block_students?.some((bs: any) => 
            bs.blocks?.teacher_program_loads?.teacher_course_loads?.academic_year === ay
          )
        );
      }
      if (term && term !== "all") {
        result = result.filter(s => 
          s.block_students?.some((bs: any) => 
            bs.blocks?.teacher_program_loads?.teacher_course_loads?.term === term
          )
        );
      }

      setStudents(result);
    } catch (err) {
      console.error("Error fetching students:", err);
      setLoadError("Failed to load students.");
    } finally {
      setIsLoading(false);
    }
  }, [blockId, ay, term]);

  const fetchCatalogs = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // Fetch all programs this teacher is involved in
      const { data: tplData } = await supabase
        .from("teacher_program_loads")
        .select(`
          program_id,
          programs_lookup (*),
          teacher_course_loads!inner (teacher_id)
        `)
        .eq("teacher_course_loads.teacher_id", userData.user.id);
      
      const progs = (tplData || []).map(tpl => tpl.programs_lookup).filter(Boolean) as unknown as Program[];
      setAvailablePrograms(progs);

      const { data: blocks } = await supabase
        .from("blocks")
        .select(`
          id,
          name,
          year,
          teacher_program_loads!inner (
            id,
            teacher_course_loads!inner (
              teacher_id
            )
          )
        `)
        .eq("teacher_program_loads.teacher_course_loads.teacher_id", userData.user.id);
      
      const mappedSections: Section[] = (blocks || []).map(b => ({
        id: b.id,
        course_id: "", // not used in filter
        block_id: b.id,
        name: b.name,
        year: b.year,
        students_estimated: 0,
        essays_estimated: 0,
        created_at: ""
      }));
      setAvailableSections(mappedSections);
    } catch (err) {
      console.error("Error fetching catalogs:", err);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    if (!blockId) fetchCatalogs();
  }, [fetchStudents, fetchCatalogs, blockId]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = 
        s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.student_code && s.student_code.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesProgram = programFilter === "All Programs" || s.program_id === programFilter;
      
      // Section filtering is tricky because students can be in multiple blocks
      // but the redesign seems to favor 1 block per student per teacher course
      const matchesSection = sectionFilter === "All Sections" || s.block_students?.some((bs: any) => bs.block_id === sectionFilter);

      return matchesSearch && matchesProgram && matchesSection;
    });
  }, [students, searchQuery, programFilter, sectionFilter]);

  const handleInputChange = (field: string, value: any) => {
    setNewStudent(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateStudent = async (studentData?: Partial<Student>) => {
    const dataToUse = studentData || newStudent;
    setIsCreatingStudent(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      // 1. Global Uniqueness Check
      const { data: existingData, error: checkError } = await supabase
        .from("students")
        .select(`
          id,
          student_code,
          email,
          programs_lookup (
            abbr,
            departments (code)
          ),
          block_students (
            blocks (name, year)
          )
        `)
        .or(`student_code.eq.${dataToUse.student_code}${dataToUse.email ? `,email.eq.${dataToUse.email}` : ""}`)
        .limit(1);

      if (checkError) console.error("Check error:", checkError);

      if (existingData && existingData.length > 0) {
        const existingStudent = existingData[0];
        const prog = (existingStudent.programs_lookup as any)?.abbr || "???";
        const dept = (existingStudent.programs_lookup as any)?.departments?.code || "???";
        const blockObj = (existingStudent.block_students as any[])?.[0]?.blocks;
        const blockName = blockObj ? `${blockObj.year}${blockObj.name}` : "No Block";
        
        const field = existingStudent.student_code === dataToUse.student_code ? "Student ID" : "Email";
        throw new Error(`${field} already exists in ${dept} > ${prog} ${blockName}`);
      }

      let finalStudentData = { ...dataToUse, teacher_id: userData.user.id };

      if (blockId) {
        // Auto-fill from block if provided
        const { data: bData } = await supabase
          .from("blocks")
          .select(`name, year, teacher_program_loads (program_id)`)
          .eq("id", blockId)
          .single();
        
        if (bData) {
          const tpl = bData.teacher_program_loads as any;
          finalStudentData.program_id = tpl.program_id;
          finalStudentData.year = bData.year;
          finalStudentData.block_name = bData.name;
        }
      }

      const { data: newS, error } = await supabase
        .from("students")
        .insert(finalStudentData)
        .select()
        .single();

      if (error) throw error;

      if (blockId) {
        await supabase.from("block_students").insert({
          block_id: blockId,
          student_id: newS.id
        });
      }

      // 4. Provision Student Account if email exists (Secure Backend Mode)
      if (newS.email) {
        try {
          const provisionResult = await authApi.provisionStudentAccount({
            email: newS.email,
            student_code: newS.student_code,
            first_name: newS.first_name,
            last_name: newS.last_name,
            middle_name: newS.middle_name || undefined,
          });

          // 5. Send Welcome Email if newly created
          if (provisionResult.created && provisionResult.temp_password) {
            await sendStudentWelcomeEmail({
              to_name: `${newS.first_name} ${newS.last_name}`,
              to_email: newS.email,
              student_code: newS.student_code,
              temp_password: provisionResult.temp_password,
            });
          }
        } catch (provisionErr) {
          console.error("Failed to provision student auth via backend:", provisionErr);
          showError("Student added, but failed to setup login account via server.");
        }
      }

      setStudents(prev => [newS, ...prev]);
      showSuccess("Student added successfully!");
      setIsAddDialogOpen(false);
      setNewStudent({
        student_code: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
      });
      return newS;
    } catch (err: any) {
      showError(err.message || "Failed to create student.");
      throw err;
    } finally {
      setIsCreatingStudent(false);
    }
  };

  const handleUpdateStudent = async (studentId: string, updates: Partial<Student>) => {
    try {
      const { data, error } = await supabase
        .from("students")
        .update(updates)
        .eq("id", studentId)
        .select()
        .single();
      
      if (error) throw error;
      setStudents(prev => prev.map(s => s.id === studentId ? (data as Student) : s));
      showSuccess("Student updated.");
      setIsEditDialogOpen(false);
      setEditingStudent(null);
      return data;
    } catch (err) {
      showError("Failed to update student.");
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    showWarning("Are you sure you want to remove this student?", {
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("students")
            .delete()
            .eq("id", studentId);
          
          if (error) throw error;
          setStudents(prev => prev.filter(s => s.id !== studentId));
          showSuccess("Student removed.");
        } catch (err) {
          showError("Failed to remove student.");
        }
      }
    });
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsEditDialogOpen(true);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setProgramFilter("All Programs");
    setSectionFilter("All Sections");
  };

  const hasActiveFilters = searchQuery !== "" || programFilter !== "All Programs" || sectionFilter !== "All Sections";

  const handleBatchUploadComplete = () => {
    fetchStudents();
    showSuccess("Batch upload successful!");
  };

  return {
    students: filteredStudents,
    isLoading,
    loadError,
    searchQuery,
    setSearchQuery,
    programFilter,
    setProgramFilter,
    sectionFilter,
    setSectionFilter,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isCreatingStudent,
    editingStudent,
    setEditingStudent,
    availablePrograms,
    availableSections,
    hasActiveFilters,
    newStudent,
    handleInputChange,
    handleCreateStudent,
    handleUpdateStudent,
    handleDeleteStudent,
    handleEditStudent,
    handleClearFilters,
    handleBatchUploadComplete,
    handleClearProgramFilter: () => setProgramFilter("All Programs"),
    handleClearSectionFilter: () => setSectionFilter("All Sections"),
    AlertComponent,
    refreshStudents: fetchStudents
  };
}
