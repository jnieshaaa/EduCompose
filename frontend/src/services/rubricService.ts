// Rubric service for data operations

import { supabase } from "../lib/supabaseClient";
import type {
  RubricTemplate,
  CriteriaRow,
  PlatformRubric,
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
        "id, name, description, criteria, grading_intensity, created_at"
      )
      .eq("user_id", teacherId)
      .order("created_at", { ascending: false });


    if (rubricsError) {
      console.error("Error loading rubrics:", rubricsError);
      return [];
    }

    const mappedRubrics: (RubricTemplate & {
      fullData?: Record<string, unknown>;
    })[] = (rubricsData || []).map((r: any) => {
      // Extract criteria from JSONB
      const criteriaObj: unknown = r.criteria;
      const criteriaData = extractCriteriaFromSupabase(criteriaObj) || [];

      return {
        id: r.id,
        name: r.name,
        criteria: criteriaData.length,
        programs: 0, // programs column removed
        lastUsed: r.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
        level: "College",
        fullData: {
          id: r.id,
          name: r.name,
          description: r.description || "",
          criteria: criteriaData,
          type: r.grading_intensity || "Basic",
          programs: [],
        },
      };
    });

    return mappedRubrics;
  } catch (err) {
    console.error("Unexpected error loading rubrics:", err);
    return [];
  }
};

// Load platform rubrics (admin-created rubrics OR system defaults)
export const fetchPlatformRubrics = async (): Promise<PlatformRubric[]> => {
  try {
    // We fetch rubrics and join with users to check roles
    // owner:users!user_id(role) tells Supabase to join 'users' table on 'user_id' column
    const { data, error } = await supabase
      .from("rubrics")
      .select("id, name, description, criteria, grading_intensity, created_at, user_id, owner:users!user_id(role)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading platform rubrics:", error);
      return [];
    }

    // Filter: user_id is null OR owner's role is 'admin'
    const platformData = (data || []).filter((r: any) => {
      // Handle cases where Supabase might return join as an array
      const owner = Array.isArray(r.owner) ? r.owner[0] : r.owner;
      const role = owner?.role;
      
      // If user_id is null, it's a system rubric
      // If role is admin, it's an admin-created rubric
      return r.user_id === null || role === "admin";
    });

    return platformData.map((r: any) => {
      const criteriaData = extractCriteriaFromSupabase(r.criteria) || [];
      return {
        id: r.id,
        name: r.name,
        description: r.description || "",
        type: (r.grading_intensity as any) || "Basic",
        criteria: criteriaData,
        programs: 0,
        lastUpdated: r.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      };
    });
  } catch (err) {
    console.error("Unexpected error loading platform rubrics:", err);
    return [];
  }
};

// Save platform rubric (admin only)
export const savePlatformRubric = async (
  rubricFormData: {
    name: string;
    description?: string;
    gradingIntensity: string;
    programs: string[];
    criteria: CriteriaRow[];
  }
) => {
  console.log("[savePlatformRubric] Attempting to create platform rubric:", rubricFormData.name);
  
  const { data, error } = await supabase.rpc('api_create_rubric_v1', {
    p_name: rubricFormData.name,
    p_description: rubricFormData.description,
    p_criteria: { criteria: rubricFormData.criteria }, // Keep same structure as old logic
    p_grading_intensity: rubricFormData.gradingIntensity,
    p_is_platform: true
  });

  if (error) {
    console.error("[savePlatformRubric] Error:", error);
    if (error.message.includes("already exists")) {
       const err = new Error(error.message) as any;
       err.code = "DUPLICATE_RUBRIC";
       throw err;
    }
    throw error;
  }

  console.log("[savePlatformRubric] Success! Created rubric ID:", data);
  return { id: data };
};

// Save rubric to Supabase (Teacher)
export const saveRubric = async (
  rubricFormData: {
    name: string;
    gradingIntensity: string;
    programs: string[];
    criteria: CriteriaRow[];
  }
) => {
  console.log("[saveRubric] Attempting to create teacher rubric:", rubricFormData.name);
  
  const { data, error } = await supabase.rpc('api_create_rubric_v1', {
    p_name: rubricFormData.name,
    p_criteria: { criteria: rubricFormData.criteria }, // Match old structure
    p_grading_intensity: rubricFormData.gradingIntensity,
    p_is_platform: false
  });

  if (error) {
    console.error("[saveRubric] Error:", error);
    if (error.message.includes("already exists")) {
       const err = new Error(error.message) as any;
       err.code = "DUPLICATE_RUBRIC";
       throw err;
    }
    throw error;
  }

  console.log("[saveRubric] Success! Created rubric ID:", data);
  return { id: data };
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
  console.log("[saveTemplateRubric] Creating from template:", rubric.name);
  
  const { data, error } = await supabase.rpc('api_create_rubric_v1', {
    p_name: rubric.name,
    p_description: rubric.description,
    p_criteria: { criteria: rubric.criteria },
    p_grading_intensity: rubric.type,
    p_is_platform: false
  });

  if (error) {
    console.error("[saveTemplateRubric] Error:", error);
    if (error.message.includes("already exists")) {
       const err = new Error(error.message) as any;
       err.code = "DUPLICATE_RUBRIC";
       throw err;
    }
    throw error;
  }

  return { id: data };
};

// Delete rubric from Supabase
export const deleteRubric = async (rubricId: string): Promise<void> => {
  const teacherId = await fetchTeacherId();
  if (!teacherId) return;

  const { error } = await supabase
    .from("rubrics")
    .delete()
    .eq("id", rubricId)
    .eq("user_id", teacherId);

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
  if (!teacherId) throw new Error("Could not resolve teacher UUID");

  // Check if another rubric with the same name already exists for this teacher (excluding current rubric)
  const { data: existingRubrics, error: checkError } = await supabase
    .from("rubrics")
    .select("id, name")
    .eq("user_id", teacherId)
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
      grading_intensity: rubricFormData.gradingIntensity,
      user_id: teacherId,
      created_by: teacherId,
    })
    .eq("id", rubricId)
    .eq("user_id", teacherId) // Ensure only the owner can update
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
  rubricId: string
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

    const r = rubricData as any;
    const criteriaObj: unknown = r.criteria;
    const criteriaData = extractCriteriaFromSupabase(criteriaObj) || [];
    const programsList = extractProgramsFromSupabase(r.programs, criteriaObj) || [];

    return {
      id: r.id,
      name: r.name,
      criteria: criteriaData.length,
      programs: programsList.length,
      lastUsed: r.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      level: "College",
      programsList: programsList,
      fullData: {
        id: r.id,
        name: r.name,
        description: r.description || "",
        criteria: criteriaData,
        type: r.grading_intensity || "Basic",
        programs: programsList,
      },
    };
  } catch (err) {
    console.error("Unexpected error loading rubric:", err);
    return null;
  }
};
