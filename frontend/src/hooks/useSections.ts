import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { Section } from "../data/sectionsData";
import { initialNewSectionState } from "../data/sectionsData";
import { initialProgramsData } from "../data/programsData";
import { supabase } from "../lib/supabaseClient";
import { useAlert } from "./useAlert";
import type { UploadResult } from "../services/BatchUploadController";

export function useSections() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess, showWarning } = useAlert();

  // Read program filter from URL params (for drill-down from Programs)
  const urlProgramFilter = searchParams.get("program");
  const urlSearchQuery = searchParams.get("search");

  // STATE: Main list of sections
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery || "");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSection, setNewSection] = useState(initialNewSectionState);
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [programFilter, setProgramFilter] = useState(
    urlProgramFilter || "All Programs"
  );
  const [termFilter, setTermFilter] = useState("All Terms");

  // Helper to get course names from the Programs list for dropdowns
  const [availablePrograms, setAvailablePrograms] = useState<string[]>(
    initialProgramsData.map((p) => p.name)
  );

  // Map to store program tracks limit (program name -> tracks count)
  const [programTracksMap, setProgramTracksMap] = useState<Map<string, number>>(
    new Map(initialProgramsData.map((p) => [p.name, p.tracks]))
  );

  // Map to store program name -> program_id for lookups
  const [programNameToIdMap, setProgramNameToIdMap] = useState<
    Map<string, number>
  >(new Map());

  // Sync programFilter and searchQuery with URL params
  useEffect(() => {
    if (urlProgramFilter) {
      setProgramFilter(urlProgramFilter);
    }
    if (urlSearchQuery !== null) {
      setSearchQuery(urlSearchQuery);
    }
  }, [urlProgramFilter, urlSearchQuery]);

  // If user opens the Add dialog while viewing a specific program (drill-down),
  // pre-fill the new section's program and keep it fixed to that program.
  useEffect(() => {
    if (isAddDialogOpen && urlProgramFilter) {
      setNewSection((prev) => ({ ...prev, program: urlProgramFilter }));
    }
  }, [isAddDialogOpen, urlProgramFilter]);

  // Load sections + programs from Supabase (teacher-end).
  useEffect(() => {
    const fetchSections = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        // Load programs first to map program_id -> name and store tracks
        const { data: programsData, error: programsError } = await supabase
          .from("programs")
          .select("id, name, tracks")
          .order("id", { ascending: true });

        if (programsError) {
          throw programsError;
        }

        const programMap = new Map<number, string>();
        const tracksMap = new Map<string, number>();
        const nameToIdMap = new Map<string, number>();
        type SupabaseProgramRow = {
          id: number;
          name: string;
          tracks?: number | null;
        };
        if (programsData) {
          (programsData as SupabaseProgramRow[]).forEach((p) => {
            programMap.set(p.id, p.name);
            // Store tracks limit for each program (default to 0 if not set)
            tracksMap.set(p.name, p.tracks ?? 0);
            // Store name -> id mapping for lookups
            nameToIdMap.set(p.name, p.id);
          });
          setAvailablePrograms(
            (programsData as SupabaseProgramRow[]).map((p) => p.name)
          );
          setProgramTracksMap(tracksMap);
          setProgramNameToIdMap(nameToIdMap);
        }

        const { data: sectionsData, error: sectionsError } = await supabase
          .from("sections")
          .select(
            "id, name, term, students_estimated, essays_estimated, program_id"
          )
          .order("id", { ascending: true });

        if (sectionsError) {
          throw sectionsError;
        }

        type SupabaseSectionRow = {
          id: number;
          name: string;
          program_id?: number | null;
          term?: string | null;
          students_estimated?: number | null;
          essays_estimated?: number | null;
        };

        const mapped: Section[] =
          (sectionsData as SupabaseSectionRow[] | undefined)?.map((row) => ({
            id: row.id,
            name: row.name,
            program:
              (row.program_id && programMap.get(row.program_id)) ||
              "Unknown program",
            term: row.term ?? "",
            students: row.students_estimated ?? 0,
            essays: row.essays_estimated ?? 0,
          })) ?? [];
        setSections(mapped);
      } catch (error) {
        console.error("Error loading sections from Supabase:", error);
        setLoadError("Unable to load blocks/sections from Supabase.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSections();
  }, []);

  // Filter Logic
  const filteredSections = useMemo(() => {
    return sections.filter((section) => {
      const matchesSearch =
        section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.term.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProgram =
        programFilter === "All Programs" || section.program === programFilter;
      const matchesTerm =
        termFilter === "All Terms" || section.term === termFilter;

      return matchesSearch && matchesProgram && matchesTerm;
    });
  }, [sections, searchQuery, programFilter, termFilter]);

  // Clear program filter and URL params
  const handleClearProgramFilter = () => {
    setProgramFilter("All Programs");
    setSearchParams({});
  };

  // Drill-down to Students filtered by section
  const handleSectionClick = (sectionName: string, programName: string) => {
    const params = new URLSearchParams();
    params.set("section", sectionName);
    params.set("program", programName);
    navigate(`/Teacher/Students?${params.toString()}`);
  };

  // HANDLE INPUT CHANGE
  const handleInputChange = (field: string, value: string) => {
    setNewSection((prev) => ({ ...prev, [field]: value }));
  };

  // HANDLE CREATE FUNCTION
  const handleCreateSection = async () => {
    // Prevent multiple submissions
    if (isCreatingSection) return;
    setIsCreatingSection(true);

    // 1. Basic validation
    if (
      !newSection.name ||
      newSection.program === "Select Program" ||
      !newSection.term ||
      parseInt(newSection.students) <= 0
    ) {
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError("Please fill in all required fields.");
      }, 100);
      setIsCreatingSection(false);
      return;
    }

    // 2. Check tracks limit validation
    const selectedProgram = newSection.program;
    const maxTracks = programTracksMap.get(selectedProgram) ?? 0;

    if (maxTracks > 0) {
      // Count existing sections for this program
      const existingSectionsCount = sections.filter(
        (s) => s.program === selectedProgram
      ).length;

      if (existingSectionsCount >= maxTracks) {
        setIsAddDialogOpen(false);
        setTimeout(() => {
          showWarning(
            `Cannot create more sections. The program "${selectedProgram}" has a maximum of ${maxTracks} track(s) (sections). You have already created ${existingSectionsCount} section(s).`
          );
        }, 100);
        setIsCreatingSection(false);
        return;
      }
    }

    // 3. Get program_id from program name
    const programId = programNameToIdMap.get(selectedProgram);
    if (!programId) {
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError(
          `Program "${selectedProgram}" not found. Please refresh and try again.`
        );
      }, 100);
      setIsCreatingSection(false);
      return;
    }

    try {
      // 4. Insert into Supabase
      const { data, error } = await supabase
        .from("sections")
        .insert({
          program_id: programId,
          name: newSection.name,
          term: newSection.term,
          students_estimated: parseInt(newSection.students, 10),
          essays_estimated: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating section:", error);
        setIsAddDialogOpen(false);
        setTimeout(() => {
          showError(`Failed to create section: ${error.message}`);
        }, 100);
        setIsCreatingSection(false);
        return;
      }

      // 5. Map Supabase response to Section type and add to the list
      const newSectionObject: Section = {
        id: data.id,
        name: data.name,
        program: selectedProgram,
        term: data.term ?? "",
        students: data.students_estimated ?? 0,
        essays: data.essays_estimated ?? 0,
      };

      setSections((prevSections) => [newSectionObject, ...prevSections]);

      // 6. Reset form and close dialog
      setNewSection(initialNewSectionState);
      setIsAddDialogOpen(false);
      setIsCreatingSection(false);
      setTimeout(() => {
        showSuccess("Section created successfully!");
      }, 100);
    } catch (err) {
      console.error("Unexpected error creating section:", err);
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError("An unexpected error occurred while creating the section.");
      }, 100);
      setIsCreatingSection(false);
    }
  };

  // HANDLE EDIT FUNCTION
  const handleEditSection = (section: Section) => {
    setEditingSection(section);
    setIsEditDialogOpen(true);
  };

  // HANDLE UPDATE FUNCTION for editing a section
  const handleUpdateSection = async () => {
    if (!editingSection) return;

    // 1. Basic validation
    if (
      !editingSection.name ||
      editingSection.program === "Select Program" ||
      !editingSection.term ||
      editingSection.students < 0
    ) {
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showError("Please fill in all required fields.");
      }, 100);
      return;
    }

    // 2. Get program_id from program name
    const programId = programNameToIdMap.get(editingSection.program);
    if (!programId) {
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showError(
          `Program "${editingSection.program}" not found. Please refresh and try again.`
        );
      }, 100);
      return;
    }

    try {
      // 3. Update in Supabase
      const { error } = await supabase
        .from("sections")
        .update({
          program_id: programId,
          name: editingSection.name,
          term: editingSection.term,
          students_estimated: editingSection.students,
        })
        .eq("id", editingSection.id);

      if (error) {
        console.error("Error updating section:", error);
        setIsEditDialogOpen(false);
        setTimeout(() => {
          showError(`Failed to update section: ${error.message}`);
        }, 100);
        return;
      }

      // 4. Update local state
      setSections((prevSections) =>
        prevSections.map((s) =>
          s.id === editingSection.id ? editingSection : s
        )
      );

      // 5. Reset and close dialog
      setEditingSection(null);
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showSuccess("Section updated successfully!");
      }, 100);
    } catch (err) {
      console.error("Unexpected error updating section:", err);
      setIsEditDialogOpen(false);
      setTimeout(() => {
        showError("An unexpected error occurred while updating the section.");
      }, 100);
    }
  };

  // HANDLE DELETE FUNCTION
  const handleDeleteSection = (section: Section) => {
    showWarning(
      `Are you sure you want to delete section "${section.name}"? This action cannot be undone and will affect all students in this section.`,
      {
        title: "Delete Section",
        showCancel: true,
        confirmText: "Delete",
        cancelText: "Cancel",
        onConfirm: async () => {
          try {
            const { error } = await supabase
              .from("sections")
              .delete()
              .eq("id", section.id);

            if (error) {
              console.error("Error deleting section:", error);
              showError(`Failed to delete section: ${error.message}`);
              return;
            }

            // Remove from local state
            setSections((prevSections) =>
              prevSections.filter((s) => s.id !== section.id)
            );

            showSuccess("Section deleted successfully!");
          } catch (err) {
            console.error("Unexpected error deleting section:", err);
            showError(
              "An unexpected error occurred while deleting the section."
            );
          }
        },
      }
    );
  };

  // HANDLE BATCH UPLOAD
  const handleBatchUploadComplete = (result: UploadResult) => {
    if (result.success && result.data) {
      // Add imported sections to the list
      setSections((prevSections) => [
        ...(result.data as Section[]),
        ...prevSections,
      ]);
    }
  };

  // Check if we're in drill-down mode (filtered from Programs)
  const isDrillDown = urlProgramFilter !== null;

  return {
    // State
    sections: filteredSections,
    allSections: sections, // Full list for tracks validation
    isLoading,
    loadError,
    searchQuery,
    programFilter,
    termFilter,
    isAddDialogOpen,
    newSection,
    isCreatingSection,
    isEditDialogOpen,
    editingSection,
    availablePrograms,
    programTracksMap,
    urlProgramFilter,
    isDrillDown,
    // Setters
    setSearchQuery,
    setProgramFilter,
    setTermFilter,
    setIsAddDialogOpen,
    setNewSection,
    setIsEditDialogOpen,
    setEditingSection,
    // Handlers
    handleInputChange,
    handleCreateSection,
    handleEditSection,
    handleUpdateSection,
    handleDeleteSection,
    handleClearProgramFilter,
    handleSectionClick,
    handleBatchUploadComplete,
  };
}
