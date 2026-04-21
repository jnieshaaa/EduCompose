// Rubric-related types

export type RubricView = "list" | "options";

export interface SupabaseRubricRow {
  id: string;
  name: string;
  description?: string | null;
  criteria: unknown; // JSONB column, can be array or object
  programs?: unknown; // could be string[] or null
  grading_intensity?: string | null;
  created_at?: string | null;
}

// Re-export types from components/rubrics/types
export type {
  ScoreLevel,
  CriteriaRow,
  RubricFormData,
  PlatformRubric,
  BuilderMode,
} from "../components/rubrics/types";

// Re-export RubricTemplate from data/rubricsData
export type { RubricTemplate } from "../constants/rubrics";
