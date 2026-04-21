// Rubric service for data operations

import { supabase } from "../lib/supabaseClient";
import type {
  SupabaseRubricRow,
  RubricTemplate,
  CriteriaRow,
} from "../types/rubricTypes";
// Helper function to get type badge color
export const getTypeBadgeColor = (type: string): string => {
  switch (type) {
    case "Basic":
      return "bg-green-400/20 text-green-700/90 border-green-500";
    case "Professional":
      return "bg-blue-400/20 text-blue-700/90 border-blue-500";
    case "Advanced":
      return "bg-yellow-400/20 text-yellow-700/90 border-yellow-500";
    case "Technical":
      return "bg-orange-400/20 text-orange-700/90 border-orange-500";
    default:
      return "bg-neutral-400/20 text-neutral-600/90 border-neutral-500";
  }
};

// Helper to safely extract criteria from Supabase JSONB
export const extractCriteriaFromSupabase = (
  criteriaObj: unknown
): CriteriaRow[] | null => {
  if (typeof criteriaObj === "object" && criteriaObj !== null) {
    const maybeCriteria = (criteriaObj as Record<string, unknown>)["criteria"];
    if (Array.isArray(maybeCriteria)) {
      return maybeCriteria as CriteriaRow[];
    }
  }

  if (Array.isArray(criteriaObj)) {
    return criteriaObj as CriteriaRow[];
  }

  return null;
};

// Helper to extract programs from Supabase row
export const extractProgramsFromSupabase = (
  programs: unknown,
  criteriaObj: unknown
): string[] => {
  if (Array.isArray(programs)) {
    return programs as string[];
  }

  // Fallback to metadata in criteria for backward compatibility
  if (criteriaObj && typeof criteriaObj === "object") {
    const maybeMeta = (criteriaObj as Record<string, unknown>)["metadata"];
    if (maybeMeta && typeof maybeMeta === "object") {
      const programsVal = (maybeMeta as Record<string, unknown>)["programs"];
      if (Array.isArray(programsVal)) {
        return programsVal as string[];
      }
    }
  }

  return [];
};

// Get the user's UUID from Supabase auth (matches auth_user_id in users table)
export const fetchTeacherUUID = async (): Promise<string | null> => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch (err) {
    console.error("Error fetching teacher UUID:", err);
    return null;
  }
};

// Load user ID (UUID) from Supabase auth (standardized)
export const fetchTeacherId = async (): Promise<string | null> => {
  return await fetchTeacherUUID();
};

// Load rubrics for a teacher
export const fetchTeacherRubrics = async (): Promise<(RubricTemplate & {
  programsList?: string[];
  fullData?: Record<string, unknown>;
})[]> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) return [];

    const { data: rubricsData, error: rubricsError } = await supabase
      .from("rubrics")
      .select(
        "id, name, description, criteria, programs, grading_intensity, created_at"
      )
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });


    if (rubricsError) {
      console.error("Error loading rubrics:", rubricsError);
      return [];
    }

    const mappedRubrics: (RubricTemplate & {
      programsList?: string[];
      fullData?: Record<string, unknown>;
    })[] = (rubricsData || []).map((r: SupabaseRubricRow) => {
      // Extract criteria from JSONB
      const criteriaObj: unknown = r.criteria;
      const criteriaData = extractCriteriaFromSupabase(criteriaObj) || [];

      // Extract programs from dedicated column, fallback to criteria metadata for backward compatibility
      const programs = extractProgramsFromSupabase(r.programs, criteriaObj);

      return {
        id: r.id,
        name: r.name,
        criteria: criteriaData.length,
        programs: programs.length,
        lastUsed: r.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
        level: "College",
        programsList: programs,
        fullData: {
          id: r.id,
          name: r.name,
          description: r.description || "",
          criteria: criteriaData,
          type: r.grading_intensity || "Basic",
          programs: programs,
        },
      };
    });

    return mappedRubrics;
  } catch (err) {
    console.error("Unexpected error loading rubrics:", err);
    return [];
  }
};

// Save platform rubric (admin only - teacher_id is null)
export const savePlatformRubric = async (
  rubricFormData: {
    name: string;
    description?: string;
    gradingIntensity: string;
    programs: string[];
    criteria: CriteriaRow[];
  }
) => {
  const rubricName = rubricFormData.name?.trim() || "Untitled Rubric";

  // Check if a platform rubric with the same name already exists
  const { data: existingRubrics, error: checkError } = await supabase
    .from("rubrics")
    .select("id, name")
    .is("teacher_id", null) // Platform rubrics
    .ilike("name", rubricName);

  if (checkError) {
    console.error("Error checking for duplicate platform rubric:", checkError);
    throw checkError;
  }

  if (existingRubrics && existingRubrics.length > 0) {
    const error = new Error(
      `A platform rubric with the name "${rubricName}" already exists. Please choose a different name.`
    ) as Error & { code?: string };
    error.code = "DUPLICATE_RUBRIC";
    throw error;
  }

  const { data, error } = await supabase
    .from("rubrics")
    .insert({
      name: rubricName,
      description: rubricFormData.description || `Grading intensity: ${rubricFormData.gradingIntensity}`,
      criteria: rubricFormData.criteria,
      programs: rubricFormData.programs,
      grading_intensity: rubricFormData.gradingIntensity,
      teacher_id: null, // Platform rubric
    })
    .select()
    .maybeSingle();


  if (error) {
    console.error("Error saving platform rubric:", error);
    throw error;
  }

  return data;
};

// Save rubric to Supabase
export const saveRubric = async (
  rubricFormData: {
    name: string;
    gradingIntensity: string;
    programs: string[];
    criteria: CriteriaRow[];
  }
) => {
  const rubricName = rubricFormData.name?.trim() || "Untitled Rubric";

  const teacherId = await fetchTeacherId();
  if (!teacherId) throw new Error("Could not resolve teacher UUID");

  // Check if a rubric with the same name already exists for this teacher
  const { data: existingRubrics, error: checkError } = await supabase
    .from("rubrics")
    .select("id, name")
    .eq("teacher_id", teacherId)
    .ilike("name", rubricName); // Case-insensitive comparison

  if (checkError) {
    console.error("Error checking for duplicate rubric:", checkError);
    throw checkError;
  }

  // If a rubric with the same name exists, throw an error
  if (existingRubrics && existingRubrics.length > 0) {
    const error = new Error(
      `A rubric with the name "${rubricName}" already exists. Please choose a different name.`
    ) as Error & { code?: string };
    error.code = "DUPLICATE_RUBRIC";
    throw error;
  }

  const { data, error } = await supabase
    .from("rubrics")
    .insert({
      name: rubricName,
      description: `Grading intensity: ${rubricFormData.gradingIntensity}`,
      criteria: rubricFormData.criteria,
      programs: rubricFormData.programs,
      grading_intensity: rubricFormData.gradingIntensity,
      teacher_id: teacherId,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error saving rubric:", error);
    throw error;
  }

  return data;
};

// Save template rubric to Supabase
export const saveTemplateRubric = async (
  rubric: {
    name: string;
    description: string;
    criteria: CriteriaRow[];
    type: string;
  }
) => {
  const rubricName = rubric.name?.trim() || "Untitled Rubric";

  const teacherId = await fetchTeacherId();
  if (!teacherId) throw new Error("Could not resolve teacher UUID");

  // Check if a rubric with the same name already exists for this teacher
  const { data: existingRubrics, error: checkError } = await supabase
    .from("rubrics")
    .select("id, name")
    .eq("teacher_id", teacherId)
    .ilike("name", rubricName); // Case-insensitive comparison

  if (checkError) {
    console.error("Error checking for duplicate rubric:", checkError);
    throw checkError;
  }

  // If a rubric with the same name exists, throw an error
  if (existingRubrics && existingRubrics.length > 0) {
    const error = new Error(
      `A rubric with the name "${rubricName}" already exists. Please choose a different name.`
    ) as Error & { code?: string };
    error.code = "DUPLICATE_RUBRIC";
    throw error;
  }

  const { data, error } = await supabase
    .from("rubrics")
    .insert({
      name: rubricName,
      description: rubric.description,
      criteria: rubric.criteria,
      programs: [], // Template rubrics don't have specific programs
      grading_intensity: rubric.type, // Use type as intensity
      teacher_id: teacherId,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error saving template rubric:", error);
    throw error;
  }

  return data;
};

// Delete rubric from Supabase
export const deleteRubric = async (rubricId: string | number): Promise<void> => {
  const teacherId = await fetchTeacherId();
  if (!teacherId) return;

  const { error } = await supabase
    .from("rubrics")
    .delete()
    .eq("id", rubricId)
    .eq("teacher_id", teacherId);

  if (error) {
    console.error("Error deleting rubric:", error);
    throw error;
  }
};

// Update rubric in Supabase
export const updateRubric = async (
  rubricId: string,
  rubricFormData: {
    name: string;
    gradingIntensity: string;
    programs: string[];
    criteria: CriteriaRow[];
  }
) => {
  const rubricName = rubricFormData.name?.trim() || "Untitled Rubric";

  const teacherId = await fetchTeacherId();
  if (!teacherId) throw new Error("Could not resolve numeric teacher ID");

  // Check if another rubric with the same name already exists for this teacher (excluding current rubric)
  const { data: existingRubrics, error: checkError } = await supabase
    .from("rubrics")
    .select("id, name")
    .eq("teacher_id", teacherId)
    .ilike("name", rubricName); // Case-insensitive comparison

  if (checkError) {
    console.error("Error checking for duplicate rubric:", checkError);
    throw checkError;
  }

  // If another rubric with the same name exists (excluding current rubric), throw an error
  if (
    existingRubrics &&
    existingRubrics.some((r) => r.id !== rubricId && r.name.toLowerCase() === rubricName.toLowerCase())
  ) {
    const error = new Error(
      `A rubric with the name "${rubricName}" already exists. Please choose a different name.`
    ) as Error & { code?: string };
    error.code = "DUPLICATE_RUBRIC";
    throw error;
  }

  const { data, error } = await supabase
    .from("rubrics")
    .update({
      name: rubricName,
      description: `Grading intensity: ${rubricFormData.gradingIntensity}`,
      criteria: rubricFormData.criteria,
      programs: rubricFormData.programs,
      grading_intensity: rubricFormData.gradingIntensity,
      teacher_id: teacherId,
    })
    .eq("id", rubricId)
    .eq("teacher_id", teacherId) // Ensure only the owner can update
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error updating rubric:", error);
    throw error;
  }

  return data;
};

// Fetch a single rubric by ID
export const fetchRubricById = async (
  rubricId: string | number
): Promise<(RubricTemplate & { programsList?: string[]; fullData?: Record<string, unknown> }) | null> => {
  try {
    const { data: rubricData, error: rubricError } = await supabase
      .from("rubrics")
      .select(
        "id, name, description, criteria, programs, grading_intensity, created_at"
      )
      .eq("id", rubricId)
      .maybeSingle();

    if (rubricError || !rubricData) {
      console.error("Error loading rubric:", rubricError);
      return null;
    }

    const r = rubricData as SupabaseRubricRow;
    const criteriaObj: unknown = r.criteria;
    const criteriaData = extractCriteriaFromSupabase(criteriaObj) || [];
    const programs = extractProgramsFromSupabase(r.programs, criteriaObj);

    return {
      id: r.id,
      name: r.name,
      criteria: criteriaData.length,
      programs: programs.length,
      lastUsed: r.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      level: "College",
      programsList: programs,
      fullData: {
        id: r.id,
        name: r.name,
        description: r.description || "",
        criteria: criteriaData,
        type: r.grading_intensity || "Basic",
        programs: programs,
      },
    };
  } catch (err) {
    console.error("Unexpected error loading rubric:", err);
    return null;
  }
};
