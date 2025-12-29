// Rubric data and business logic

import type { CriteriaRow } from "../components/rubrics/types";
import {
  platformRubrics,
  defaultRubricFormData,
  initialCriteria,
} from "../components/rubrics/types";

// Re-export platform rubrics and default data
export { platformRubrics, defaultRubricFormData, initialCriteria };

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
