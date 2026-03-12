import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import type { Student } from "../data/studentsData";
import { initialNewStudentState } from "../data/studentsData";
import { supabase } from "../lib/supabaseClient";
import { useAlert } from "./useAlert";
import type { UploadResult } from "../services/BatchUploadController";
import { useAcademicContext } from "./useAcademicContext";
import { buildFullName } from "../utils/nameUtils";

// Types for Supabase query results

interface EnrollmentRow {
  block_id: string;
  student_id: number;
  students: {
    id: number;
    student_code: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    email: string | null;
    is_active: boolean;
  }[];
}

// Helper to get user ID from authenticated user
const getTeacherId = async (): Promise<number | null> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error getting authenticated user:", userError);
      return null;
    }

    const { data: userData, error: userTableError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (userTableError || !userData) {
      console.error("Error getting user record:", userTableError);
      return null;
    }

    return userData.id;
  } catch (err) {
    console.error("Unexpected error fetching user ID:", err);
    return null;
  }
};

// Helper function to parse full name into first, middle, last
export const parseName = (
  fullName: string,
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

const generateTempPassword = () => {
  const randomPart = Math.random().toString(36).slice(-8);
  return `${randomPart}Aa1!`;
};

const provisionStudentAuthAccount = async (payload: {
  email: string;
  student_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
}) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
    | string
    | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  const isolatedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const tempPassword = generateTempPassword();
  const { error } = await isolatedClient.auth.signUp({
    email: payload.email.trim().toLowerCase(),
    password: tempPassword,
    options: {
      data: {
        role: "student",
        student_code: payload.student_code.toUpperCase(),
        first_name: payload.first_name,
        middle_name: payload.middle_name,
        last_name: payload.last_name,
        full_name: buildFullName(
          payload.first_name,
          payload.middle_name,
          payload.last_name,
          payload.student_code,
        ),
      },
    },
  });

  if (error) {
    const errorText = error.message.toLowerCase();
    if (
      errorText.includes("already") ||
      errorText.includes("exists") ||
      errorText.includes("registered")
    ) {
      return {
        created: false,
        tempPassword: null,
      };
    }
    throw error;
  }

  return {
    created: true,
    tempPassword,
  };
};

export function useStudents(
  showArchived: boolean = false,
  ay?: string,
  term?: string,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess, showWarning, AlertComponent } = useAlert();
  const {
    currentAY,
    currentSemester,
    isLoading: isLoadingAcademic,
  } = useAcademicContext();

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
    urlProgramFilter || "All Programs",
  );
  const [sectionFilter, setSectionFilter] = useState(
    urlSectionFilter || "All Sections",
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
    Map<string, string>
  >(new Map());
  const [sectionNameToIdMap, setSectionNameToIdMap] = useState<
    Map<string, string>
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

  // Load students + programs from Supabase (teacher-end).
  useEffect(() => {
    if (isLoadingAcademic) return;

    const fetchStudents = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const teacherId = await getTeacherId();
        if (!teacherId) {
          setIsLoading(false);
          return;
        }

        // 1. Fetch Teacher's personal loads to find assigned blocks
        const { data: loadsData, error: loadsError } = await supabase
          .from("teacher_course_loads")
          .select(`
            id,
            block_id,
            blocks (id, name, program_id)
          `)
          .eq("teacher_id", teacherId)
          .eq("academic_year", currentAY)
          .eq("term", currentSemester);

        if (loadsError) throw loadsError;

        const assignedBlocks = (loadsData || [])
          .map(l => l.blocks)
          .filter(b => b !== null) as unknown as {id: string, name: string, program_id: string}[];

        const blockIds = assignedBlocks.map((b) => b.id);
        const blockMap = new Map<string, string>();
        const blockNameToId = new Map<string, string>();

        assignedBlocks.forEach((block) => {
          blockMap.set(block.id, block.name);
          blockNameToId.set(block.name, block.id);
        });

        setAvailableSections(Array.from(blockNameToId.keys()));
        setSectionNameToIdMap(blockNameToId);

        if (blockIds.length === 0) {
          setStudents([]);
          setIsLoading(false);
          return;
        }

        // 2. Fetch All Available Programs for the Enrollment Form
        const { data: programsData, error: programsError } = await supabase
          .from("programs_lookup")
          .select("id, name, abbreviation");

        if (!programsError && programsData) {
          const pNames = programsData.map((p) => p.abbreviation || p.name);
          const pMap = new Map<string, string>();
          programsData.forEach((p) => {
            pMap.set(p.abbreviation || p.name, p.id);
          });
          setAvailablePrograms(pNames);
          setProgramNameToIdMap(pMap);
        }

        // 3. Fetch students belonging to these blocks via block_students
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from("block_students")
          .select(
            `
            block_id,
            student_id,
            students (*)
          `,
          )
          .in("block_id", blockIds);

        if (enrollmentError) throw enrollmentError;

        const codeToDbId = new Map<string, number>();
        const mapped: Student[] = (
          (enrollmentData as unknown as EnrollmentRow[]) || []
        )
          .map((row) => {
            const s =
              row.students && row.students.length > 0 ? row.students[0] : null;
            if (!s) return null;
            codeToDbId.set(s.student_code, s.id);
            return {
              id: s.student_code,
              name: buildFullName(
                s.first_name,
                s.middle_name,
                s.last_name,
                s.student_code,
              ),
              email: s.email ?? "",
              program: "N/A",
              section: blockMap.get(row.block_id) || "Unknown",
              submitted: 0,
              pending: 0,
              missing: 0,
              avgScore: 0,
              yearLevel: "1",
            };
          })
          .filter((s) => s !== null) as Student[];

        setStudentCodeToDbIdMap(codeToDbId);
        setStudents(mapped);
      } catch (error) {
        console.error("Error loading students:", error);
        setLoadError("Unable to load students.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [isLoadingAcademic, currentAY, currentSemester, showArchived, ay, term]);

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
          "Please fill in all required fields (First Name, Last Name, Student ID, Email, Program, and Section).",
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
          `Program "${newStudent.program}" not found. Please refresh and try again.`,
        );
      }, 100);
      setIsCreatingStudent(false);
      return;
    }
    if (!sectionId) {
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError(
          `Section "${newStudent.section}" not found. Please refresh and try again.`,
        );
      }, 100);
      setIsCreatingStudent(false);
      return;
    }

    // 3. Check for duplicate email (case-insensitive)
    const emailToCheck = newStudent.email.trim().toLowerCase();
    const existingStudentWithEmail = students.find(
      (s) => s.email.toLowerCase() === emailToCheck,
    );
    if (existingStudentWithEmail) {
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError(
          `A student with the email "${newStudent.email}" already exists. Please use a different email address.`,
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
          `A student with the email "${newStudent.email}" already exists. Please use a different email address.`,
        );
      }, 100);
      setIsCreatingStudent(false);
      return;
    }

    // 5. Use separate name fields directly
    try {
      // 1. Check if student already exists in the general students table
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id, student_code, first_name, middle_name, last_name, email")
        .eq("student_code", newStudent.id.toUpperCase())
        .maybeSingle();

      let studentDbId: number;

      if (existingStudent) {
        studentDbId = existingStudent.id;
      } else {
        // 2. Create student if they don't exist
        const { data: createdStudent, error: createError } = await supabase
          .from("students")
          .insert({
            student_code: newStudent.id.toUpperCase(),
            first_name: newStudent.firstName.trim(),
            middle_name: newStudent.middleName.trim() || null,
            last_name: newStudent.lastName.trim(),
            email: newStudent.email.trim(),
          })
          .select()
          .single();

        if (createError) throw createError;
        studentDbId = createdStudent.id;
      }

      // 2.5 Ensure a student auth account exists (created on first enrollment)
      const provisionResult = await provisionStudentAuthAccount({
        email: newStudent.email.trim(),
        student_code: newStudent.id.toUpperCase(),
        first_name: newStudent.firstName.trim(),
        middle_name: newStudent.middleName.trim() || undefined,
        last_name: newStudent.lastName.trim(),
      });

      // 3. Link student to the block
      const { error: blockStudentError } = await supabase
        .from("block_students")
        .insert({
          block_id: sectionId,
          student_id: studentDbId,
        });

      if (blockStudentError) {
        if (blockStudentError.code === "23505") {
          showError("This student is already enrolled in this block.");
        } else {
          throw blockStudentError;
        }
        return;
      }

      // 4. Update UI
      const fullName = buildFullName(
        existingStudent?.first_name ?? newStudent.firstName,
        existingStudent?.middle_name ?? newStudent.middleName,
        existingStudent?.last_name ?? newStudent.lastName,
        newStudent.id.toUpperCase(),
      );

      const newStudentObject: Student = {
        id: newStudent.id.toUpperCase(),
        name: fullName,
        email: existingStudent?.email ?? newStudent.email.trim(),
        program: newStudent.program,
        section: newStudent.section,
        submitted: 0,
        pending: 0,
        missing: 0,
        avgScore: 0,
        yearLevel: "1",
      };

      setStudentCodeToDbIdMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(newStudent.id.toUpperCase(), studentDbId);
        return newMap;
      });

      setStudents((prev) => [newStudentObject, ...prev]);
      setNewStudent(initialNewStudentState);
      setIsAddDialogOpen(false);
      if (provisionResult.created && provisionResult.tempPassword) {
        showSuccess(
          `Student enrolled and account created. Temporary password: ${provisionResult.tempPassword}`,
        );
      } else {
        showSuccess(
          "Student enrolled successfully! Student account already exists.",
        );
      }
    } catch (err: unknown) {
      console.error("Unexpected error enrolling student:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      showError(errorMessage);
    } finally {
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
          `Program "${editingStudent.program}" not found. Please refresh and try again.`,
        );
      }, 100);
      return;
    }
    if (!sectionId) {
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showError(
          `Section "${editingStudent.section}" not found. Please refresh and try again.`,
        );
      }, 100);
      return;
    }

    // 3. Parse name into first, middle, last (from the full name string)
    const { first_name, middle_name, last_name } = parseName(
      editingStudent.name,
    );

    // 4. Get database id from student_code
    const dbId = studentCodeToDbIdMap.get(editingStudent.id);
    if (!dbId) {
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showError(
          "Student not found in database. Please refresh and try again.",
        );
      }, 100);
      return;
    }

    // 5. Check for duplicate email (case-insensitive), excluding current student
    const emailToCheck = editingStudent.email.trim().toLowerCase();
    const existingStudentWithEmail = students.find(
      (s) =>
        s.id !== editingStudent.id && s.email.toLowerCase() === emailToCheck,
    );
    if (existingStudentWithEmail) {
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showError(
          `A student with the email "${editingStudent.email}" already exists. Please use a different email address.`,
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
          `A student with the email "${editingStudent.email}" already exists. Please use a different email address.`,
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
              `A student with the email "${editingStudent.email}" already exists. Please use a different email address.`,
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
          s.id === editingStudent.id ? editingStudent : s,
        ),
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
              "Student not found in database. Please refresh and try again.",
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
              prevStudents.filter((s) => s.id !== student.id),
            );
            studentCodeToDbIdMap.delete(student.id);

            showSuccess("Student deleted successfully!");
          } catch (err) {
            console.error("Unexpected error deleting student:", err);
            showError(
              "An unexpected error occurred while deleting the student.",
            );
          }
        },
      },
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
              `Student ${student.id}: Program or section not found. Skipping.`,
            );
            continue;
          }

          // Check for duplicate email (case-insensitive)
          if (student.email) {
            const emailToCheck = student.email.trim().toLowerCase();
            const existingStudentWithEmail = students.find(
              (s) => s.email.toLowerCase() === emailToCheck,
            );
            if (existingStudentWithEmail) {
              errors.push(
                `Student ${student.id}: Email "${student.email}" already exists. Skipping.`,
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
                `Student ${student.id}: Email "${student.email}" already exists. Skipping.`,
              );
              continue;
            }
          }

          // Parse name into first, middle, last
          const { first_name, middle_name, last_name } = parseName(
            student.name,
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
                `Student ${student.id}: Email "${student.email}" already exists. Skipping.`,
              );
            } else {
              errors.push(`Student ${student.id}: ${error.message}`);
            }
            continue;
          }

          // Provision Auth account for each imported student
          if (student.email?.trim()) {
            try {
              await provisionStudentAuthAccount({
                email: student.email.trim(),
                student_code: student.id.toUpperCase(),
                first_name,
                middle_name: middle_name || undefined,
                last_name,
              });
            } catch (provisionErr) {
              errors.push(
                `Student ${student.id}: enrolled, but account provisioning failed (${provisionErr instanceof Error ? provisionErr.message : "unknown error"}).`,
              );
            }
          }

          // Link student to block
          const { error: blockStudentError } = await supabase
            .from("block_students")
            .insert({
              block_id: sectionId,
              student_id: data.id,
            });

          if (blockStudentError) {
            if (blockStudentError.code === "23505") {
              errors.push(
                `Student ${student.id}: already enrolled in this block.`,
              );
            } else {
              errors.push(
                `Student ${student.id}: ${blockStudentError.message}`,
              );
            }
            continue;
          }

          // Map Supabase response to Student type
          const newStudentObject: Student = {
            id: data.student_code,
            name: buildFullName(
              data.first_name,
              data.middle_name,
              data.last_name,
              student.name,
            ),
            email: data.email ?? "",
            program: student.program,
            section: student.section,
            submitted: 0,
            pending: 0,
            missing: 0,
            avgScore: 0,
            yearLevel: "1",
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
            }`,
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
            }`,
          );
        }, 100);
      }

      // Show errors if any
      if (errors.length > 0 && studentsToAdd.length === 0) {
        setTimeout(() => {
          showError(
            `Failed to import students: ${errors.slice(0, 3).join(", ")}${
              errors.length > 3 ? ` and ${errors.length - 3} more` : ""
            }`,
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
