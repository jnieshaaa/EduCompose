// Rubric service for data operations

import { supabase } from "../lib/supabaseClient";
import type {
  SupabaseRubricRow,
  RubricTemplate,
  CriteriaRow,
} from "../types/rubricTypes";
import {
  extractCriteriaFromSupabase,
  extractProgramsFromSupabase,
} from "../data/rubricData";

// Helper to safely read metadata.programs from unknown criteria JSON
const getMetadataPrograms = (obj: unknown): string[] | undefined => {
  if (!obj || typeof obj !== "object") return undefined;
  const maybeMeta = (obj as Record<string, unknown>)["metadata"];
  if (!maybeMeta || typeof maybeMeta !== "object") return undefined;
  const programsVal = (maybeMeta as Record<string, unknown>)["programs"];
  if (Array.isArray(programsVal)) return programsVal as string[];
  return undefined;
};

// Load teacher ID from Supabase
export const fetchTeacherId = async (): Promise<number | null> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error getting user:", userError);
      return null;
    }

    const { data: teacherData, error: teacherError } = await supabase
      .from("teachers")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (teacherError || !teacherData) {
      console.error("Error getting teacher:", teacherError);
      return null;
    }

    return teacherData.id;
  } catch (err) {
    console.error("Unexpected error fetching teacher ID:", err);
    return null;
  }
};

// Load rubrics for a teacher
export const fetchTeacherRubrics = async (
  teacherId: number
): Promise<(RubricTemplate & {
  programsList?: string[];
  fullData?: Record<string, unknown>;
})[]> => {
  try {
    const { data: rubricsData, error: rubricsError } = await supabase
      .from("rubrics")
      .select(
        "id, name, description, criteria, programs, grading_intensity, created_at"
      )
      .eq("created_by", teacherId)
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
      const criteriaData = extractCriteriaFromSupabase(criteriaObj);

      // Extract programs from dedicated column, fallback to criteria metadata for backward compatibility
      const programs = extractProgramsFromSupabase(r.programs, criteriaObj);

      return {
        id: r.id,
        name: r.name,
        criteria: criteriaData?.length || 0,
        programs: programs.length,
        lastUsed: r.created_at
          ? new Date(r.created_at).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        level: "College",
        // Store programs array for display
        programsList: programs,
        // Store full rubric data for preview
        fullData: {
          id: r.id,
          name: r.name,
          description: r.description || "",
          type: r.grading_intensity || "Basic",
          criteria: criteriaData || [],
          programs: programs.length,
          lastUpdated: r.created_at
            ? new Date(r.created_at).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        },
      };
    });

    return mappedRubrics;
  } catch (err) {
    console.error("Unexpected error loading rubrics:", err);
    return [];
  }
};

// Save rubric to Supabase
export const saveRubric = async (
  rubricFormData: {
    name: string;
    gradingIntensity: string;
    programs: string[];
    criteria: CriteriaRow[];
  },
  teacherId: number
) => {
  const { data, error } = await supabase
    .from("rubrics")
    .insert({
      name: rubricFormData.name || "Untitled Rubric",
      description: `Grading intensity: ${rubricFormData.gradingIntensity}`,
      criteria: rubricFormData.criteria,
      programs: rubricFormData.programs,
      grading_intensity: rubricFormData.gradingIntensity,
      created_by: teacherId,
    })
    .select()
    .single();

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
  },
  teacherId: number
) => {
  const { data, error } = await supabase
    .from("rubrics")
    .insert({
      name: rubric.name,
      description: rubric.description,
      criteria: rubric.criteria,
      programs: [], // Template rubrics don't have specific programs
      grading_intensity: rubric.type, // Use type as intensity
      created_by: teacherId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving template rubric:", error);
    throw error;
  }

  return data;
};

