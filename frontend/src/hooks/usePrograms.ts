import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Program } from "../types/Common";

const initialNewProgramState: Partial<Program> = {
  name: "",
  description: "",
};
import { supabase } from "../lib/supabaseClient";
import { useAlert } from "./useAlert";
import type { UploadResult } from "../services/BatchUploadController";

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

type SupabaseProgramRow = {
  id: string; // UUID from programs_lookup table
  name: string;
};

export function usePrograms() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showAlert, showError, showSuccess, showWarning, AlertComponent } = useAlert();

  // Read search query from URL params
  const urlSearchQuery = searchParams.get("search");

  // STATE FOR THE LIST OF PROGRAMS
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery || "");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProgram, setNewProgram] = useState(initialNewProgramState);
  const [isCreating, setIsCreating] = useState(false);

  // Load programs from Supabase (teacher-end) – filtered by authenticated teacher.
  useEffect(() => {
    const fetchPrograms = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const teacherId = await getTeacherId();
        if (!teacherId) {
          // If we can't identify the teacher, we shouldn't show any data
          // (or potentially redirect to login, but here we just show empty)
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("programs_lookup")
          .select("id, name")
          .order("name", { ascending: true });

        if (error) {
          console.error("Error loading programs from Supabase:", error);
          setLoadError("Unable to load programs from Supabase.");
          return;
        }

        const mapped: Program[] =
          (data as SupabaseProgramRow[] | undefined)?.map((row) => ({
            id: row.id,
            name: row.name,
            sectionCount: 0,
            studentCount: 0,
          })) ?? [];
        setPrograms(mapped);
      } catch (err) {
        console.error("Unexpected error loading programs:", err);
        setLoadError("Unable to load programs from Supabase.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  // Sync searchQuery with URL params
  useEffect(() => {
    if (urlSearchQuery !== null) {
      setSearchQuery(urlSearchQuery);
    }
  }, [urlSearchQuery]);

  // Filter Logic
  const filteredPrograms = useMemo(() => {
    return programs.filter((program) =>
      program.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [programs, searchQuery]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalPrograms = programs.length;
    const totalSections = programs.reduce(
      (acc, p) => acc + (p.sectionCount ?? 0),
      0,
    );
    const totalStudents = programs.reduce(
      (acc, p) => acc + (p.studentCount ?? 0),
      0,
    );
    return { totalPrograms, totalSections, totalStudents };
  }, [programs]);

  // HANDLE INPUT CHANGE
  const handleInputChange = (field: string, value: string) => {
    setNewProgram((prev) => ({ ...prev, [field]: value }));
  };

  // HANDLE CREATE FUNCTION
  const handleCreateProgram = async (
    // programsToCreate: Array<{ name: string; description: string }>,
    programsToCreate: Array<{ name: string }>,
  ) => {
    // Prevent multiple submissions
    if (isCreating) return;
    setIsCreating(true);

    // 1. Validate fields
    if (!programsToCreate || programsToCreate.length === 0) {
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError("Please fill in required fields correctly.");
      }, 100);
      setIsCreating(false);
      return;
    }

    const normalizedPrograms = programsToCreate.map((program) => ({
      name: program.name.trim(),
      // description: program.description.trim(),
    }));

    const invalidProgram = normalizedPrograms.find(
      // (program) => !program.name || !program.description,
      (program) => !program.name,
    );

    if (invalidProgram) {
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError("Please fill in required fields correctly.");
      }, 100);
      setIsCreating(false);
      return;
    }

    const inputNameSet = new Set<string>();
    for (const program of normalizedPrograms) {
      const lower = program.name.toLowerCase();
      if (inputNameSet.has(lower)) {
        setIsAddDialogOpen(false);
        setTimeout(() => {
          showAlert(
            "Duplicate program names detected in your list. Please remove duplicates and try again.",
            { title: "Duplicate Program", type: "error" },
          );
        }, 100);
        setIsCreating(false);
        return;
      }
      inputNameSet.add(lower);
    }

    try {
      // 2. Get teacher ID for created_by
      const teacherId = await getTeacherId();
      if (!teacherId) {
        setIsAddDialogOpen(false);
        setTimeout(() => {
          showError("Unable to identify teacher. Please try logging in again.");
        }, 100);
        setIsCreating(false);
        return;
      }

      // 3. Check for duplicates against existing programs (case-insensitive)
      const existingLowerNames = new Set(
        programs.map((program) => program.name.toLowerCase()),
      );

      const duplicatesExisting = normalizedPrograms.filter((program) =>
        existingLowerNames.has(program.name.toLowerCase()),
      );

      const uniqueToInsert = normalizedPrograms.filter(
        (program) => !existingLowerNames.has(program.name.toLowerCase()),
      );

      if (uniqueToInsert.length === 0) {
        setIsCreating(false);
        setIsAddDialogOpen(false);
        setTimeout(() => {
        showAlert(
          `All selected programs already exist: ${duplicatesExisting
            .map((p) => p.name)
            .join(", ")}.`,
          {
            type: "error",
            title: "Duplicate Program",
            onConfirm: () => {
              setIsAddDialogOpen(true);
            },
          },
        );
        }, 100);
        return;
      }

      // 4. Insert into Supabase (batch insert) - programs_lookup doesn't use created_by
      const programsToInsert = uniqueToInsert.map((program) => ({
        name: program.name,
        department_id: null, // TODO: Set appropriate department_id
        abbr: program.name.substring(0, 10).toUpperCase(), // Generate abbreviation
      }));

      const { data, error } = await supabase
        .from("programs_lookup")
        .insert(programsToInsert)
        .select();

      if (error) {
        console.error("Error creating program(s):", error);
        setIsCreating(false);
        if (
          error.code === "23505" ||
          error.message?.toLowerCase().includes("duplicate") ||
          error.message?.toLowerCase().includes("unique")
        ) {
          setIsAddDialogOpen(false);
          setTimeout(() => {
            showAlert(
              "One or more programs already exist. Please use different names.",
              {
                type: "error",
                title: "Duplicate Program",
                onConfirm: () => {
                  setIsAddDialogOpen(true);
                },
              },
            );
          }, 100);
        } else {
          setIsAddDialogOpen(false);
          setTimeout(() => {
            showAlert(`Failed to create program: ${error.message}`, { type: 'error' });
          }, 100);
        }
        return;
      }

      const createdPrograms: Program[] = (
        (data as SupabaseProgramRow[] | null) || []
      ).map((row) => ({
        id: row.id,
        name: row.name,
      }));

      setPrograms((prevPrograms) => [...createdPrograms, ...prevPrograms]);

      if (duplicatesExisting.length > 0) {
        setTimeout(() => {
          showWarning(
            `Skipped existing program(s): ${duplicatesExisting
              .map((p) => p.name)
              .join(", ")}.`,
            { title: "Duplicate Program" },
          );
        }, 100);
      }

      // 5. Reset form and close dialog
      setNewProgram(initialNewProgramState);
      setIsAddDialogOpen(false);
      setIsCreating(false);
      setTimeout(() => {
        showSuccess(
          `Program${createdPrograms.length > 1 ? "s" : ""} created successfully!`,
        );
      }, 100);
    } catch (err) {
      console.error("Unexpected error creating program:", err);
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError("An unexpected error occurred while creating the program.");
      }, 100);
      setIsCreating(false);
    }
  };

  // Drill-down navigation to Sections filtered by program
  const handleProgramClick = (programName: string) => {
    navigate(`/Teacher/Sections?program=${encodeURIComponent(programName)}`);
  };

  // HANDLE BATCH UPLOAD
  const handleBatchUploadComplete = async (result: UploadResult) => {
    if (result.success && result.data) {
      const importedPrograms = result.data as Program[];

      if (importedPrograms.length === 0) {
        return;
      }

      try {
        // Get teacher ID for created_by
        const teacherId = await getTeacherId();
        if (!teacherId) {
          showError("Unable to identify teacher. Please try logging in again.");
          return;
        }

        // Prepare programs for Supabase insertion - programs_lookup doesn't use created_by
        const programsToInsert = importedPrograms.map((program) => ({
          name: program.name.trim(),
          department_id: null, // TODO: Set appropriate department_id
          abbr: program.name.trim().substring(0, 10).toUpperCase(),
        }));

        // Insert all programs into Supabase
        const { data: insertedPrograms, error } = await supabase
          .from("programs_lookup")
          .insert(programsToInsert)
          .select();

        if (error) {
          console.error("Error saving batch programs to Supabase:", error);
          showError(`Failed to save programs to database: ${error.message}`);
          return;
        }

        // Map Supabase response to Program type
        const savedPrograms: Program[] = (
          (insertedPrograms as SupabaseProgramRow[] | null) || []
        ).map((p) => ({
          id: p.id,
          name: p.name,
        }));

        // Add imported programs to the list
        setPrograms((prevPrograms) => [...savedPrograms, ...prevPrograms]);

        showSuccess(
          `Successfully imported ${savedPrograms.length} program(s)!`,
        );
      } catch (err) {
        console.error("Unexpected error saving batch programs:", err);
        showError("An unexpected error occurred while saving programs.");
      }
    }
  };

  // HANDLE DELETE FUNCTION
  const handleDeleteProgram = (program: Program) => {
    showWarning(
      `Are you sure you want to delete program "${program.name}"? This action cannot be undone and will affect all sections and students in this program.`,
      {
        title: "Delete Program",
        showCancel: true,
        confirmText: "Delete",
        cancelText: "Cancel",
        onConfirm: async () => {
          try {
            const { error } = await supabase
              .from("programs_lookup")
              .delete()
              .eq("id", program.id);

            if (error) {
              console.error("Error deleting program:", error);
              showError(`Failed to delete program: ${error.message}`);
              return;
            }

            // Remove from local state
            setPrograms((prevPrograms) =>
              prevPrograms.filter((p) => p.id !== program.id),
            );

            showSuccess("Program deleted successfully!");
          } catch (err) {
            console.error("Unexpected error deleting program:", err);
            showError(
              "An unexpected error occurred while deleting the program.",
            );
          }
        },
      },
    );
  };

  return {
    // State
    programs: filteredPrograms,
    allPrograms: programs,
    isLoading,
    loadError,
    searchQuery,
    isAddDialogOpen,
    newProgram,
    isCreating,
    stats,
    // Setters
    setSearchQuery,
    setIsAddDialogOpen,
    setNewProgram,
    // Handlers
    handleInputChange,
    handleCreateProgram,
    handleProgramClick,
    handleDeleteProgram,
    handleBatchUploadComplete,
    // Alert Component
    AlertComponent,
  };
}
