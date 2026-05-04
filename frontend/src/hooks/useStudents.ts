import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAlert } from "./useAlert";
import type { Student, Program, Section } from "../types/academic";
import { useAcademicContext } from "./useAcademicContext";
import { createNotification } from "../services/notificationService";

export function useStudents(blockId?: string, ay?: string, term?: string, showArchived: boolean = false) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { showSuccess, showError, showWarning, AlertComponent } = useAlert();
  const { currentAY, currentSemester } = useAcademicContext();
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);

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

      const selectQuery = blockId 
        ? `
            *,
            student_profiles!inner (*),
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
          `
        : `
            *,
            student_profiles!inner (*),
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
          `;

      let query = supabase.from("users").select(selectQuery).eq("role", "student");

      if (blockId) {
        // Filter by specific block
        query = query.eq("block_students.block_id", blockId);
      } else {
        // For the general students tab, show students managed by this teacher
        query = query.eq("student_profiles.teacher_id", userData.user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      
      let result = (data || []).map((s: any) => {
        // Flatten student_profiles academic data into the main object
        const spRaw = s.student_profiles;
        const sp = Array.isArray(spRaw) ? spRaw[0] : spRaw;
        
        if (!sp) {
        }

        return {
          ...s,
          student_code: sp?.student_code || "N/A",
          year: sp?.year || 1,
          block_name: sp?.block_name || "N/A",
          program_id: sp?.program_id || "",
          enrollment_status: sp?.enrollment_status || "active",
          id: s.id // Ensure user ID is not overwritten by profile ID
        };
      });

      
      // Filter by blockId in JS if we removed !inner from the query
      if (blockId) {
        const preFilterCount = result.length;
        result = result.filter(s => 
          (s.block_students || []).some((bs: any) => bs.block_id === blockId)
        );
      }

      // Manual filtering for AY and Term since it's deep in the join
      if (!showArchived) {
        if (currentAY && currentSemester) {
          const filtered = result.filter(s => 
            (s.block_students || []).some((bs: any) => {
              // Handle potential arrays from Supabase joins
              const tplRaw = bs.blocks?.teacher_program_loads;
              const tpl = Array.isArray(tplRaw) ? tplRaw[0] : tplRaw;
              const tclRaw = tpl?.teacher_course_loads;
              const tcl = Array.isArray(tclRaw) ? tclRaw[0] : tclRaw;

              const match = tcl?.academic_year === currentAY && tcl?.term === currentSemester;
              if (!match && blockId) {
              }
              return match;
            })
          );
          
          if (filtered.length === 0 && result.length > 0) {
          }
          result = filtered;
        }
      } else {
        // Archive view: apply specific filters
        if (ay && ay !== "all") {
          result = result.filter(s => 
            (s.block_students || []).some((bs: any) => {
              const tplRaw = bs.blocks?.teacher_program_loads;
              const tpl = Array.isArray(tplRaw) ? tplRaw[0] : tplRaw;
              const tclRaw = tpl?.teacher_course_loads;
              const tcl = Array.isArray(tclRaw) ? tclRaw[0] : tclRaw;
              return tcl?.academic_year === ay;
            })
          );
        }
        if (term && term !== "all") {
          result = result.filter(s => 
            (s.block_students || []).some((bs: any) => {
              const tplRaw = bs.blocks?.teacher_program_loads;
              const tpl = Array.isArray(tplRaw) ? tplRaw[0] : tplRaw;
              const tclRaw = tpl?.teacher_course_loads;
              const tcl = Array.isArray(tclRaw) ? tclRaw[0] : tclRaw;
              return tcl?.term === term;
            })
          );
        }

        // ALWAYS exclude current when archiving if context available
        if (currentAY && currentSemester) {
          result = result.filter(s => 
            (s.block_students || []).every((bs: any) => {
              const tplRaw = bs.blocks?.teacher_program_loads;
              const tpl = Array.isArray(tplRaw) ? tplRaw[0] : tplRaw;
              const tclRaw = tpl?.teacher_course_loads;
              const tcl = Array.isArray(tclRaw) ? tclRaw[0] : tclRaw;
              return tcl?.academic_year !== currentAY || tcl?.term !== currentSemester;
            })
          );
        }
      }

      setStudents(result);

      // Fetch pending students if in a block context
      if (blockId) {
        try {
          const { data: bData } = await supabase
            .from("blocks")
            .select(`
              name, 
              year, 
              teacher_program_loads!fk_block_program_load (program_id)
            `)
            .eq("id", blockId)
            .single();
          
          if (bData) {
            const tpl = Array.isArray(bData.teacher_program_loads) ? bData.teacher_program_loads[0] : bData.teacher_program_loads;
            const programId = tpl?.program_id;

            const { data: pendingData } = await supabase
              .from("pending_student_registrations")
              .select("*")
              .eq("processed", false)
              .eq("block_name", bData.name)
              .eq("year", bData.year)
              .eq("program_id", programId);
            
            setPendingStudents(pendingData || []);
          }
        } catch (pendingErr) {
          console.error("Error fetching pending students:", pendingErr);
        }
      } else {
        setPendingStudents([]);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      setLoadError("Failed to load students.");
    } finally {
      setIsLoading(false);
    }
  }, [blockId, ay, term, currentAY, currentSemester, showArchived, showError]);

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
          teacher_program_loads!fk_block_program_load!inner (
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

      // 1. Global Uniqueness Check (against active students)
      const { data: existingData, error: checkError } = await supabase
        .from("users")
        .select(`
          id,
          email,
          student_profiles (
            student_code,
            program_id,
            programs_lookup (
              abbr,
              departments (code)
            )
          )
        `)
        .eq("role", "student")
        .or(`email.eq.${dataToUse.email ? dataToUse.email : "null"}`);

      // Check student_code separately as it's now in a different table
      const { data: existingProfile } = await supabase
        .from("student_profiles")
        .select("user_id")
        .eq("student_code", dataToUse.student_code)
        .maybeSingle();

      if (checkError) console.error("Check error:", checkError);

      if ((existingData && existingData.length > 0) || existingProfile) {
        const isEmailConflict = existingData && existingData.some(u => u.email === dataToUse.email);
        const field = isEmailConflict ? "Email" : "Student ID";
        throw new Error(`${field} already exists in active student list.`);
      }

      // 1b. Check against PENDING registrations
      const { data: pendingExists } = await supabase
        .from("pending_student_registrations")
        .select("id")
        .eq("student_code", dataToUse.student_code)
        .eq("processed", false)
        .maybeSingle();
      
      if (pendingExists) {
        throw new Error(`Student ${dataToUse.student_code} is already in the pending approval list.`);
      }

      // 2. Cross-role email conflict check (users table)
      // Prevent creating student records that reuse teacher/admin emails.
      if (dataToUse.email && dataToUse.email.trim()) {
        const normalizedEmail = dataToUse.email.trim().toLowerCase();
        const { data: existingUser, error: userLookupError } = await supabase
          .from("users")
          .select("id, role, first_name, last_name, email")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (userLookupError) {
          console.error("Users email conflict check error:", userLookupError);
          throw new Error("Failed to validate email uniqueness. Please try again.");
        }

        if (existingUser) {
          const existingRole = (existingUser.role || "").toLowerCase();
          if (existingRole !== "student") {
            throw new Error(
              `Email is already used by a ${existingRole || "user"} account. Please use a different student email.`,
            );
          }
          throw new Error("Email is already used by another student account.");
        }
      }

      let finalPendingData: any = {
        teacher_id: userData.user.id,
        student_code: dataToUse.student_code,
        first_name: dataToUse.first_name,
        last_name: dataToUse.last_name,
        middle_name: dataToUse.middle_name || null,
        email: dataToUse.email,
        birthday: dataToUse.birthday || null,
        program_id: dataToUse.program_id,
        year: dataToUse.year || 1,
        block_name: dataToUse.block_name || "",
        academic_year: currentAY,
        term: currentSemester
      };

      if (blockId) {
        // Resolve more info from block
        const { data: bData } = await supabase
          .from("blocks")
          .select(`
            name, 
            year, 
            teacher_program_loads!fk_block_program_load (
              program_id,
              teacher_course_loads (id, course_id, academic_year, term)
            )
          `)
          .eq("id", blockId)
          .single();
        
        if (bData) {
          const tplRaw = bData.teacher_program_loads;
          const tpl = Array.isArray(tplRaw) ? tplRaw[0] : tplRaw;
          
          if (tpl) {
            finalPendingData.program_id = tpl.program_id;
            finalPendingData.year = bData.year;
            finalPendingData.block_name = bData.name;
            
            const tclRaw = tpl.teacher_course_loads;
            const tcl = Array.isArray(tclRaw) ? tclRaw[0] : tclRaw;
            
            if (tcl) {
              finalPendingData.course_id = tcl.course_id;
              finalPendingData.academic_year = tcl.academic_year;
              finalPendingData.term = tcl.term;
            }
          }
        }
      }

      const { data: newP, error } = await supabase
        .from("pending_student_registrations")
        .insert(finalPendingData)
        .select()
        .single();

      if (error) throw error;

      // 4. Notification sent to student is deferred until Admin Approval
      // (Removed redundant email dispatch to prevent confusion since student cannot login yet)

      // 5. Notify Admins
      try {
        const { data: admins } = await supabase
          .from("users")
          .select("id")
          .eq("role", "admin");

        if (admins && admins.length > 0) {
          const teacherName = userData.user.user_metadata?.first_name 
            ? `${userData.user.user_metadata.first_name} ${userData.user.user_metadata.last_name || ""}`
            : "A teacher";

          for (const admin of admins) {
            await createNotification({
              user_id: admin.id,
              type: "info",
              title: "Pending Student Registration",
              message: `${teacherName} submitted ${newP.first_name} ${newP.last_name} (${newP.student_code}) for approval.`,
            });
          }
        }
      } catch (notifErr) {
        console.error("Failed to notify admins:", notifErr);
      }

      showSuccess("Registration submitted for Admin approval!");
      setIsAddDialogOpen(false);
      setNewStudent({
        student_code: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
      });
      return newP;
    } catch (err: any) {
      showError(err.message || "Failed to create student.");
      throw err;
    } finally {
      setIsCreatingStudent(false);
    }
  };

  const handleUpdateStudent = async (studentId: string, updates: Partial<Student>) => {
    try {
      const userTableFields = ['email', 'first_name', 'middle_name', 'last_name', 'suffix', 'is_active'];
      const studentFields = [
        'student_code', 'year', 'block_name', 'enrollment_status', 
        'program_id', 'school_id', 'department_id', 'onboarding_completed'
      ];

      const userData: any = {};
      const profileData: any = {};

      Object.entries(updates).forEach(([key, value]) => {
        if (userTableFields.includes(key)) userData[key] = value;
        else if (studentFields.includes(key)) profileData[key] = value;
      });

      if (Object.keys(userData).length > 0) {
        const { error } = await supabase.from("users").update(userData).eq("id", studentId);
        if (error) throw error;
      }

      if (Object.keys(profileData).length > 0) {
        const { error } = await supabase.from("student_profiles").update(profileData).eq("user_id", studentId);
        if (error) throw error;
      }

      // Re-fetch to get complete updated state
      await fetchStudents();
      showSuccess("Student updated.");
      setIsEditDialogOpen(false);
      setEditingStudent(null);
      return true;
    } catch (err) {
      showError("Failed to update student.");
      return false;
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    showWarning(
      blockId 
      ? "Are you sure you want to remove this student from this class? You can add them back later." 
      : "Are you sure you want to permanently delete this student?", {
      onConfirm: async () => {
        try {
          if (blockId) {
            const { error } = await supabase
              .from("block_students")
              .delete()
              .eq("student_id", studentId)
              .eq("block_id", blockId);
            if (error) throw error;
          } else {
            // Use the secure backend proxy to delete from Auth AND Local DB
            const { adminApi } = await import("../api");
            await adminApi.deleteUser(studentId);
          }
          
          setStudents(prev => prev.filter(s => s.id !== studentId));
          showSuccess(blockId ? "Student removed from class." : "Student permanently deleted.");
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
    pendingStudents,
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
