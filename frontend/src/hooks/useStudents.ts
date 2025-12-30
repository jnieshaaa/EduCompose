import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Student } from "../data/studentsData";
import { initialNewStudentState } from "../data/studentsData";
import { supabase } from "../lib/supabaseClient";
import { useAlert } from "./useAlert";
import type { UploadResult } from "../services/BatchUploadController";

// Helper function to parse full name into first, middle, last
export const parseName = (
  fullName: string
): {
  first_name: string;
  middle_name: string | null;
  last_name: string;
} => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], middle_name: null, last_name: parts[0] };
  } else if (parts.length === 2) {
    return { first_name: parts[0], middle_name: null, last_name: parts[1] };
  } else {
    return {
      first_name: parts[0],
      middle_name: parts.slice(1, -1).join(" "),
      last_name: parts[parts.length - 1],
    };
  }
};

export function useStudents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess, showWarning, AlertComponent } = useAlert();

  // Read filters from URL params (for drill-down from Sections)
  const urlProgramFilter = searchParams.get("program");
  const urlSectionFilter = searchParams.get("section");
  const urlSearchQuery = searchParams.get("search");

  // STATE: Main list of students
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [studentCodeToDbIdMap, setStudentCodeToDbIdMap] = useState<
    Map<string, number>
  >(new Map());

  // FILTER STATES - initialized from URL params
  const [programFilter, setProgramFilter] = useState(
    urlProgramFilter || "All Programs"
  );
  const [sectionFilter, setSectionFilter] = useState(
    urlSectionFilter || "All Sections"
  );
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery || "");

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState(initialNewStudentState);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Helper for dropdown options
  const [availablePrograms, setAvailablePrograms] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  // Maps to store name -> id for lookups
  const [programNameToIdMap, setProgramNameToIdMap] = useState<
    Map<string, number>
  >(new Map());
  const [sectionNameToIdMap, setSectionNameToIdMap] = useState<
    Map<string, number>
  >(new Map());

  // Sync filters with URL params
  useEffect(() => {
    if (urlProgramFilter) {
      setProgramFilter(urlProgramFilter);
    }
    if (urlSectionFilter) {
      setSectionFilter(urlSectionFilter);
    }
    if (urlSearchQuery !== null) {
      setSearchQuery(urlSearchQuery);
    }
  }, [urlProgramFilter, urlSectionFilter, urlSearchQuery]);

  // If user opens the Add dialog while in drill-down mode (from Sections),
  // pre-fill the new student's program and section and keep them fixed.
  useEffect(() => {
    if (isAddDialogOpen) {
      if (urlProgramFilter) {
        setNewStudent((prev) => ({ ...prev, program: urlProgramFilter }));
      }
      if (urlSectionFilter) {
        setNewStudent((prev) => ({ ...prev, section: urlSectionFilter }));
      }
    }
  }, [isAddDialogOpen, urlProgramFilter, urlSectionFilter]);

  // Load students + programs + sections from Supabase (teacher-end).
  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        // Load programs and sections to map ids -> names
        const [
          { data: programsData, error: programsError },
          { data: sectionsData, error: sectionsError },
        ] = await Promise.all([
          supabase.from("programs").select("id, name").order("id", {
            ascending: true,
          }),
          supabase.from("sections").select("id, name").order("id", {
            ascending: true,
          }),
        ]);

        if (programsError) throw programsError;
        if (sectionsError) throw sectionsError;

        const programMap = new Map<number, string>();
        const sectionMap = new Map<number, string>();
        const programNameToId = new Map<string, number>();
        const sectionNameToId = new Map<string, number>();

        type SupabaseProgramRow = { id: number; name: string };
        type SupabaseSectionRow = { id: number; name: string };

        if (programsData) {
          (programsData as SupabaseProgramRow[]).forEach((p) => {
            programMap.set(p.id, p.name);
            programNameToId.set(p.name, p.id);
          });
          setAvailablePrograms(
            (programsData as SupabaseProgramRow[]).map((p) => p.name)
          );
          setProgramNameToIdMap(programNameToId);
        }

        if (sectionsData) {
          (sectionsData as SupabaseSectionRow[]).forEach((s) => {
            sectionMap.set(s.id, s.name);
            sectionNameToId.set(s.name, s.id);
          });
          setAvailableSections(
            (sectionsData as SupabaseSectionRow[]).map((s) => s.name)
          );
          setSectionNameToIdMap(sectionNameToId);
        }

        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, student_code, full_name, email, program_id, section_id")
          .order("id", { ascending: true });

        if (studentsError) {
          throw studentsError;
        }

        type SupabaseStudentRow = {
          id: number;
          student_code: string;
          full_name?: string | null;
          email?: string | null;
          program_id?: number | null;
          section_id?: number | null;
        };

        const codeToDbId = new Map<string, number>();
        const mapped: Student[] =
          (studentsData as SupabaseStudentRow[] | undefined)?.map((row) => {
            codeToDbId.set(row.student_code, row.id);
            return {
              id: row.student_code,
              name: row.full_name ?? "",
              email: row.email ?? "",
              program:
                (row.program_id && programMap.get(row.program_id)) ||
                "Unknown program",
              section:
                (row.section_id && sectionMap.get(row.section_id)) ||
                "Unknown section",
              submitted: 0,
              pending: 0,
              missing: 0,
              avgScore: 0,
            };
          }) ?? [];

        setStudentCodeToDbIdMap(codeToDbId);
        setStudents(mapped);
      } catch (error) {
        console.error("Error loading students from Supabase:", error);
        setLoadError("Unable to load students from Supabase.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // Filter Logic
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.program.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProgram =
        programFilter === "All Programs" || student.program === programFilter;
      const matchesSection =
        sectionFilter === "All Sections" || student.section === sectionFilter;

      return matchesSearch && matchesProgram && matchesSection;
    });
  }, [students, searchQuery, programFilter, sectionFilter]);

  // Clear all filters and URL params
  const handleClearFilters = () => {
    setProgramFilter("All Programs");
    setSectionFilter("All Sections");
    setSearchParams({});
  };

  // Clear specific filter
  const handleClearProgramFilter = () => {
    setProgramFilter("All Programs");
    if (urlSectionFilter) {
      setSearchParams({ section: urlSectionFilter });
    } else {
      setSearchParams({});
    }
  };

  const handleClearSectionFilter = () => {
    setSectionFilter("All Sections");
    if (urlProgramFilter) {
      setSearchParams({ program: urlProgramFilter });
    } else {
      setSearchParams({});
    }
  };

  // HANDLE INPUT CHANGE
  const handleInputChange = (field: string, value: string) => {
    setNewStudent((prev) => ({ ...prev, [field]: value }));
  };

  // HANDLE CREATE FUNCTION
  const handleCreateStudent = async () => {
    // Prevent multiple submissions
    if (isCreatingStudent) return;
    setIsCreatingStudent(true);

    // 1. Validation
    if (
      !newStudent.firstName ||
      !newStudent.lastName ||
      !newStudent.id ||
      !newStudent.email ||
      newStudent.program === "Select Program" ||
      newStudent.section === "Select Section"
    ) {
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError(
          "Please fill in all required fields (First Name, Last Name, Student ID, Email, Program, and Section)."
        );
      }, 100);
      setIsCreatingStudent(false);
      return;
    }

    // 2. Get program_id and section_id from names
    const programId = programNameToIdMap.get(newStudent.program);
    const sectionId = sectionNameToIdMap.get(newStudent.section);

    if (!programId) {
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError(
          `Program "${newStudent.program}" not found. Please refresh and try again.`
        );
      }, 100);
      setIsCreatingStudent(false);
      return;
    }
    if (!sectionId) {
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError(
          `Section "${newStudent.section}" not found. Please refresh and try again.`
        );
      }, 100);
      setIsCreatingStudent(false);
      return;
    }

    // 3. Check for duplicate email (case-insensitive)
    const emailToCheck = newStudent.email.trim().toLowerCase();
    const existingStudentWithEmail = students.find(
      (s) => s.email.toLowerCase() === emailToCheck
    );
    if (existingStudentWithEmail) {
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError(
          `A student with the email "${newStudent.email}" already exists. Please use a different email address.`
        );
      }, 100);
      setIsCreatingStudent(false);
      return;
    }

    // 4. Also check in database to catch any duplicates not in local state
    const { data: existingEmailCheck, error: checkError } = await supabase
      .from("students")
      .select("id, email")
      .ilike("email", newStudent.email.trim());

    if (checkError) {
      console.error("Error checking for duplicate email:", checkError);
      // Continue anyway, let the insert handle it
    } else if (existingEmailCheck && existingEmailCheck.length > 0) {
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError(
          `A student with the email "${newStudent.email}" already exists. Please use a different email address.`
        );
      }, 100);
      setIsCreatingStudent(false);
      return;
    }

    // 5. Use separate name fields directly
    const first_name = newStudent.firstName.trim();
    const middle_name = newStudent.middleName.trim() || null;
    const last_name = newStudent.lastName.trim();

    try {
      // 6. Insert into Supabase
      const { data, error } = await supabase
        .from("students")
        .insert({
          student_code: newStudent.id.toUpperCase(),
          first_name: first_name,
          middle_name: middle_name,
          last_name: last_name,
          email: newStudent.email.trim(),
          program_id: programId,
          section_id: sectionId,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating student:", error);
        setIsAddDialogOpen(false);
        // Check if it's a duplicate email error
        if (
          error.message?.toLowerCase().includes("duplicate") ||
          error.message?.toLowerCase().includes("unique") ||
          error.code === "23505" // PostgreSQL unique violation error code
        ) {
          setTimeout(() => {
            showError(
              `A student with the email "${newStudent.email}" already exists. Please use a different email address.`
            );
          }, 100);
        } else {
          setTimeout(() => {
            showError(`Failed to create student: ${error.message}`);
          }, 100);
        }
        setIsCreatingStudent(false);
        return;
      }

      // 7. Map Supabase response to Student type and add to the list
      const fullName = [first_name, middle_name, last_name]
        .filter((part) => part)
        .join(" ");
      const newStudentObject: Student = {
        id: data.student_code,
        name: data.full_name ?? fullName,
        email: data.email ?? "",
        program: newStudent.program,
        section: newStudent.section,
        submitted: 0,
        pending: 0,
        missing: 0,
        avgScore: 0,
      };

      // Update the student code to db id map
      setStudentCodeToDbIdMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.student_code, data.id);
        return newMap;
      });

      setStudents((prevStudents) => [newStudentObject, ...prevStudents]);

      // 8. Reset form and close dialog
      setNewStudent(initialNewStudentState);
      setIsAddDialogOpen(false);
      setIsCreatingStudent(false);
      setTimeout(() => {
        showSuccess("Student created successfully!");
      }, 100);
    } catch (err) {
      console.error("Unexpected error creating student:", err);
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError("An unexpected error occurred while creating the student.");
      }, 100);
      setIsCreatingStudent(false);
    }
  };

  // HANDLE EDIT FUNCTION
  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsEditDialogOpen(true);
  };

  // HANDLE UPDATE FUNCTION for editing a student
  const handleUpdateStudent = async () => {
    if (!editingStudent) return;

    // 1. Validation
    if (
      !editingStudent.name ||
      !editingStudent.id ||
      !editingStudent.email ||
      editingStudent.program === "Select Program" ||
      editingStudent.section === "Select Section"
    ) {
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showError("Please fill in all required fields.");
      }, 100);
      return;
    }

    // 2. Get program_id and section_id from names
    const programId = programNameToIdMap.get(editingStudent.program);
    const sectionId = sectionNameToIdMap.get(editingStudent.section);

    if (!programId) {
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showError(
          `Program "${editingStudent.program}" not found. Please refresh and try again.`
        );
      }, 100);
      return;
    }
    if (!sectionId) {
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showError(
          `Section "${editingStudent.section}" not found. Please refresh and try again.`
        );
      }, 100);
      return;
    }

    // 3. Parse name into first, middle, last (from the full name string)
    const { first_name, middle_name, last_name } = parseName(
      editingStudent.name
    );

    // 4. Get database id from student_code
    const dbId = studentCodeToDbIdMap.get(editingStudent.id);
    if (!dbId) {
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showError(
          "Student not found in database. Please refresh and try again."
        );
      }, 100);
      return;
    }

    // 5. Check for duplicate email (case-insensitive), excluding current student
    const emailToCheck = editingStudent.email.trim().toLowerCase();
    const existingStudentWithEmail = students.find(
      (s) =>
        s.id !== editingStudent.id && s.email.toLowerCase() === emailToCheck
    );
    if (existingStudentWithEmail) {
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showError(
          `A student with the email "${editingStudent.email}" already exists. Please use a different email address.`
        );
      }, 100);
      return;
    }

    // 6. Also check in database to catch any duplicates not in local state
    const { data: existingEmailCheck, error: checkError } = await supabase
      .from("students")
      .select("id, email")
      .ilike("email", editingStudent.email.trim())
      .neq("id", dbId);

    if (checkError) {
      console.error("Error checking for duplicate email:", checkError);
      // Continue anyway, let the update handle it
    } else if (existingEmailCheck && existingEmailCheck.length > 0) {
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showError(
          `A student with the email "${editingStudent.email}" already exists. Please use a different email address.`
        );
      }, 100);
      return;
    }

    try {
      // 7. Update in Supabase
      const { error } = await supabase
        .from("students")
        .update({
          student_code: editingStudent.id.toUpperCase(),
          first_name: first_name,
          middle_name: middle_name,
          last_name: last_name,
          email: editingStudent.email.trim(),
          program_id: programId,
          section_id: sectionId,
        })
        .eq("id", dbId);

      if (error) {
        console.error("Error updating student:", error);
        setIsEditDialogOpen(false);
        // Check if it's a duplicate email error
        if (
          error.message?.toLowerCase().includes("duplicate") ||
          error.message?.toLowerCase().includes("unique") ||
          error.code === "23505" // PostgreSQL unique violation error code
        ) {
          setTimeout(() => {
            showError(
              `A student with the email "${editingStudent.email}" already exists. Please use a different email address.`
            );
          }, 100);
        } else {
          setTimeout(() => {
            showError(`Failed to update student: ${error.message}`);
          }, 100);
        }
        return;
      }

      // 8. Update local state
      setStudents((prevStudents) =>
        prevStudents.map((s) =>
          s.id === editingStudent.id ? editingStudent : s
        )
      );

      // 9. Reset and close dialog
      setEditingStudent(null);
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showSuccess("Student updated successfully!");
      }, 100);
    } catch (err) {
      console.error("Unexpected error updating student:", err);
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showError("An unexpected error occurred while updating the student.");
      }, 100);
    }
  };

  // HANDLE DELETE FUNCTION
  const handleDeleteStudent = (student: Student) => {
    showWarning(
      `Are you sure you want to delete student "${student.name}" (${student.id})? This action cannot be undone.`,
      {
        title: "Delete Student",
        showCancel: true,
        confirmText: "Delete",
        cancelText: "Cancel",
        onConfirm: async () => {
          const dbId = studentCodeToDbIdMap.get(student.id);
          if (!dbId) {
            showError(
              "Student not found in database. Please refresh and try again."
            );
            return;
          }

          try {
            const { error } = await supabase
              .from("students")
              .delete()
              .eq("id", dbId);

            if (error) {
              console.error("Error deleting student:", error);
              showError(`Failed to delete student: ${error.message}`);
              return;
            }

            // Remove from local state
            setStudents((prevStudents) =>
              prevStudents.filter((s) => s.id !== student.id)
            );
            studentCodeToDbIdMap.delete(student.id);

            showSuccess("Student deleted successfully!");
          } catch (err) {
            console.error("Unexpected error deleting student:", err);
            showError(
              "An unexpected error occurred while deleting the student."
            );
          }
        },
      }
    );
  };

  // HANDLE BATCH UPLOAD
  const handleBatchUploadComplete = async (result: UploadResult) => {
    if (result.success && result.data) {
      const importedStudents = result.data as Student[];

      // Save each student to Supabase
      const studentsToAdd: Student[] = [];
      const errors: string[] = [];

      for (const student of importedStudents) {
        try {
          // Get program_id and section_id from names
          const programId = programNameToIdMap.get(student.program);
          const sectionId = sectionNameToIdMap.get(student.section);

          if (!programId || !sectionId) {
            errors.push(
              `Student ${student.id}: Program or section not found. Skipping.`
            );
            continue;
          }

          // Check for duplicate email (case-insensitive)
          if (student.email) {
            const emailToCheck = student.email.trim().toLowerCase();
            const existingStudentWithEmail = students.find(
              (s) => s.email.toLowerCase() === emailToCheck
            );
            if (existingStudentWithEmail) {
              errors.push(
                `Student ${student.id}: Email "${student.email}" already exists. Skipping.`
              );
              continue;
            }

            // Also check in database
            const { data: existingEmailCheck } = await supabase
              .from("students")
              .select("id, email")
              .ilike("email", student.email.trim());

            if (existingEmailCheck && existingEmailCheck.length > 0) {
              errors.push(
                `Student ${student.id}: Email "${student.email}" already exists. Skipping.`
              );
              continue;
            }
          }

          // Parse name into first, middle, last
          const { first_name, middle_name, last_name } = parseName(
            student.name
          );

          // Insert into Supabase
          const { data, error } = await supabase
            .from("students")
            .insert({
              student_code: student.id.toUpperCase(),
              first_name: first_name,
              middle_name: middle_name,
              last_name: last_name,
              email: student.email?.trim() || null,
              program_id: programId,
              section_id: sectionId,
            })
            .select()
            .single();

          if (error) {
            // Check if it's a duplicate email error
            if (
              error.message?.toLowerCase().includes("duplicate") ||
              error.message?.toLowerCase().includes("unique") ||
              error.code === "23505"
            ) {
              errors.push(
                `Student ${student.id}: Email "${student.email}" already exists. Skipping.`
              );
            } else {
              errors.push(`Student ${student.id}: ${error.message}`);
            }
            continue;
          }

          // Map Supabase response to Student type
          const newStudentObject: Student = {
            id: data.student_code,
            name: data.full_name ?? student.name,
            email: data.email ?? "",
            program: student.program,
            section: student.section,
            submitted: 0,
            pending: 0,
            missing: 0,
            avgScore: 0,
          };

          // Update the student code to db id map
          setStudentCodeToDbIdMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(data.student_code, data.id);
            return newMap;
          });

          studentsToAdd.push(newStudentObject);
        } catch (err) {
          errors.push(
            `Student ${student.id}: ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          );
        }
      }

      // Add successfully imported students to the list
      if (studentsToAdd.length > 0) {
        setStudents((prevStudents) => [...studentsToAdd, ...prevStudents]);
        setTimeout(() => {
          showSuccess(
            `Successfully imported ${studentsToAdd.length} student(s)${
              errors.length > 0 ? ` (${errors.length} error(s))` : ""
            }`
          );
        }, 100);
      }

      // Show errors if any
      if (errors.length > 0 && studentsToAdd.length === 0) {
        setTimeout(() => {
          showError(
            `Failed to import students: ${errors.slice(0, 3).join(", ")}${
              errors.length > 3 ? ` and ${errors.length - 3} more` : ""
            }`
          );
        }, 100);
      }
    }
  };

  // Check if we have active filters
  const hasActiveFilters =
    programFilter !== "All Programs" || sectionFilter !== "All Sections";

  return {
    // State
    students: filteredStudents,
    isLoading,
    loadError,
    searchQuery,
    programFilter,
    sectionFilter,
    isAddDialogOpen,
    newStudent,
    isCreatingStudent,
    isEditDialogOpen,
    editingStudent,
    availablePrograms,
    availableSections,
    hasActiveFilters,
    // Setters
    setSearchQuery,
    setProgramFilter,
    setSectionFilter,
    setIsAddDialogOpen,
    setNewStudent,
    setIsEditDialogOpen,
    setEditingStudent,
    // Handlers
    handleInputChange,
    handleCreateStudent,
    handleEditStudent,
    handleUpdateStudent,
    handleDeleteStudent,
    handleClearFilters,
    handleClearProgramFilter,
    handleClearSectionFilter,
    handleBatchUploadComplete,
    // Alert Component (needed for delete confirmation modal)
    AlertComponent,
  };
}
