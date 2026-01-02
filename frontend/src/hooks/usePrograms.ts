import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Program } from "../data/programsData";
import { initialNewProgramState } from "../data/programsData";
import { supabase } from "../lib/supabaseClient";
import { useAlert } from "./useAlert";
import type { UploadResult } from "../services/BatchUploadController";

export function usePrograms() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showError, showSuccess, AlertComponent } = useAlert();

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

  // Load programs from Supabase (teacher-end) – falls back to mock data on error.
  useEffect(() => {
    const fetchPrograms = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const { data, error } = await supabase
          .from("programs")
          .select(
            "id, name, description, tracks, courses, avg_class_size, status"
          )
          .order("id", { ascending: true });

        if (error) {
          console.error("Error loading programs from Supabase:", error);
          setLoadError("Unable to load programs from Supabase.");
          return;
        }

        type SupabaseProgramRow = {
          id: number;
          name: string;
          description?: string | null;
          tracks?: number | null;
          courses?: number | null;
          avg_class_size?: number | null;
          status?: string | null;
        };

        const mapped: Program[] =
          (data as SupabaseProgramRow[] | undefined)?.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description ?? "",
            tracks: (row.tracks ?? 0) as number,
            courses: (row.courses ?? 0) as number,
            avgClassSize: (row.avg_class_size ?? 0) as number,
            status: (row.status ?? "Active") as string,
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
    return programs.filter(
      (program) =>
        program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [programs, searchQuery]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalStudents = programs.reduce(
      (acc, p) => acc + p.avgClassSize * p.tracks,
      0
    );
    const totalSections = programs.reduce((acc, p) => acc + p.tracks, 0);
    const activePrograms = programs.filter((p) => p.status === "Active").length;
    return { totalStudents, totalSections, activePrograms };
  }, [programs]);

  // HANDLE INPUT CHANGE
  const handleInputChange = (field: string, value: string) => {
    setNewProgram((prev) => ({ ...prev, [field]: value }));
  };

  // HANDLE CREATE FUNCTION
  const handleCreateProgram = async () => {
    // Prevent multiple submissions
    if (isCreating) return;
    setIsCreating(true);

    // 1. Validate fields (Basic check)
    if (
      !newProgram.name ||
      !newProgram.description ||
      parseInt(newProgram.tracks) < 0
    ) {
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError("Please fill in required fields correctly.");
      }, 100);
      setIsCreating(false);
      return;
    }

    try {
      // 2. Check for duplicate program name (case-insensitive)
      const trimmedProgramName = newProgram.name.trim();
      const { data: existingPrograms, error: checkError } = await supabase
        .from("programs")
        .select("id, name")
        .ilike("name", trimmedProgramName);

      if (checkError) {
        console.error("Error checking for duplicate program:", checkError);
        setIsAddDialogOpen(false);
        setTimeout(() => {
          showError(`Failed to verify program name: ${checkError.message}`);
        }, 100);
        setIsCreating(false);
        return;
      }

      if (existingPrograms && existingPrograms.length > 0) {
        // Duplicate found - close AddProgramModal and show error modal
        console.log("[usePrograms] Duplicate program found:", existingPrograms);
        setIsCreating(false);
        // Close the AddProgramModal temporarily
        setIsAddDialogOpen(false);
        // Show error modal immediately
        setTimeout(() => {
          showError(
            `A program with the name "${trimmedProgramName}" already exists. Please choose a different name.`,
            {
              title: "Duplicate Program",
              onConfirm: () => {
                // When OK is clicked, reopen the AddProgramModal so user can edit
                setIsAddDialogOpen(true);
              },
            }
          );
        }, 100);
        return;
      }

      // 3. Insert into Supabase
      const { data, error } = await supabase
        .from("programs")
        .insert({
          name: trimmedProgramName,
          description: newProgram.description,
          tracks: parseInt(newProgram.tracks, 10),
          courses: 0,
          avg_class_size: 0,
          status: newProgram.status || "Active",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating program:", error);
        setIsCreating(false);
        // Check if it's a unique constraint violation (database-level protection)
        if (
          error.code === "23505" || // PostgreSQL unique violation error code
          error.message?.toLowerCase().includes("duplicate") ||
          error.message?.toLowerCase().includes("unique")
        ) {
          // Close the AddProgramModal temporarily
          setIsAddDialogOpen(false);
          // Show error modal immediately
          setTimeout(() => {
            showError(
              `A program with the name "${trimmedProgramName}" already exists. Please choose a different name.`,
              {
                title: "Duplicate Program",
                onConfirm: () => {
                  // When OK is clicked, reopen the AddProgramModal so user can edit
                  setIsAddDialogOpen(true);
                },
              }
            );
          }, 100);
        } else {
          setIsAddDialogOpen(false);
          setTimeout(() => {
            showError(`Failed to create program: ${error.message}`);
          }, 100);
        }
        return;
      }

      // 4. Map Supabase response to Program type and add to the list
      const newProgramObject: Program = {
        id: data.id,
        name: data.name,
        description: data.description ?? "",
        tracks: data.tracks ?? 0,
        courses: data.courses ?? 0,
        avgClassSize: data.avg_class_size ?? 0,
        status: data.status ?? "Active",
      };

      setPrograms((prevPrograms) => [newProgramObject, ...prevPrograms]);

      // 5. Reset form and close dialog
      setNewProgram(initialNewProgramState);
      setIsAddDialogOpen(false);
      setIsCreating(false);
      setTimeout(() => {
        showSuccess("Program created successfully!");
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
  const handleBatchUploadComplete = (result: UploadResult) => {
    if (result.success && result.data) {
      // Add imported programs to the list
      setPrograms((prevPrograms) => [
        ...(result.data as Program[]),
        ...prevPrograms,
      ]);
    }
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
    handleBatchUploadComplete,
    // Alert Component
    AlertComponent,
  };
}
