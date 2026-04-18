// Settings Model - Type definitions for teacher settings

export interface TeacherProfile {
  title?: string;
  nickname?: string;
  school?: string;
  schoolName?: string;
  department?: string;
  departmentName?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  email: string; // Read-only, cannot be updated
}

export interface AIAssessmentSettings {
  enableGrammar: boolean;
  enableCoherence: boolean;
  enablePlagiarism: boolean;
  enableVocabulary: boolean;
  enableStructure: boolean;
  autoEvaluate: boolean;
}

export interface ThresholdSettings {
  grammarThreshold: number; // 0-100
  coherenceThreshold: number; // 0-100
  plagiarismThreshold: number; // 0-100 (similarity percentage)
  vocabularyThreshold: number; // 1-10
}

export interface RubricDefaults {
  defaultRubricId?: number | null;
  autoApplyToNewPrograms: boolean;
}

export interface TeacherSettings {
  profile: TeacherProfile;
  aiAssessment: AIAssessmentSettings;
  thresholds: ThresholdSettings;
  rubricDefaults: RubricDefaults;
}

// Default settings values
export const DEFAULT_AI_ASSESSMENT_SETTINGS: AIAssessmentSettings = {
  enableGrammar: true,
  enableCoherence: true,
  enablePlagiarism: true,
  enableVocabulary: true,
  enableStructure: true,
  autoEvaluate: false,
};

export const DEFAULT_THRESHOLD_SETTINGS: ThresholdSettings = {
  grammarThreshold: 70,
  coherenceThreshold: 65,
  plagiarismThreshold: 15,
  vocabularyThreshold: 5,
};

export const DEFAULT_RUBRIC_DEFAULTS: RubricDefaults = {
  defaultRubricId: null,
  autoApplyToNewPrograms: false,
};

// Supabase row type for teachers table
export interface SupabaseTeacherRow {
  id: number;
  auth_user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  settings?: TeacherSettings | null; // JSONB column
}
