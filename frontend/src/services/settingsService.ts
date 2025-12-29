// Settings Service (Controller) - Handles all settings data operations

import { supabase } from "../lib/supabaseClient";
import type {
  TeacherProfile,
  TeacherSettings,
  AIAssessmentSettings,
  ThresholdSettings,
  RubricDefaults,
  SupabaseTeacherRow,
} from "../types/settingsTypes";
import {
  DEFAULT_AI_ASSESSMENT_SETTINGS,
  DEFAULT_THRESHOLD_SETTINGS,
  DEFAULT_RUBRIC_DEFAULTS,
} from "../types/settingsTypes";

// Helper to get teacher ID from authenticated user
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

    const { data: teacherData, error: teacherError } = await supabase
      .from("teachers")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (teacherError || !teacherData) {
      console.error("Error getting teacher record:", teacherError);
      return null;
    }

    return teacherData.id;
  } catch (err) {
    console.error("Unexpected error fetching teacher ID:", err);
    return null;
  }
};

// Fetch teacher profile data
export const fetchTeacherProfile = async (): Promise<TeacherProfile | null> => {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return null;

    const { data, error } = await supabase
      .from("teachers")
      .select("email, full_name, institution")
      .eq("id", teacherId)
      .single();

    if (error || !data) {
      console.error("Error fetching teacher profile:", error);
      return null;
    }

    // Parse full_name into first and last name
    const fullName = data.full_name || "";
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    return {
      firstName,
      lastName,
      email: data.email || "",
      institution: (data as { institution?: string }).institution || undefined,
    };
  } catch (err) {
    console.error("Unexpected error fetching teacher profile:", err);
    return null;
  }
};

// Fetch all teacher settings
export const fetchTeacherSettings = async (): Promise<TeacherSettings | null> => {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return null;

    const { data, error } = await supabase
      .from("teachers")
      .select("email, full_name, institution, settings")
      .eq("id", teacherId)
      .single();

    if (error || !data) {
      console.error("Error fetching teacher settings:", error);
      return null;
    }

    const row = data as SupabaseTeacherRow;
    const fullName = row.full_name || "";
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Parse settings JSONB or use defaults
    const settings = row.settings || {};

    const institution = (row as { institution?: string }).institution || settings.profile?.institution;

    return {
      profile: {
        firstName,
        lastName,
        email: row.email || "",
        institution,
      },
      aiAssessment: {
        ...DEFAULT_AI_ASSESSMENT_SETTINGS,
        ...settings.aiAssessment,
      },
      thresholds: {
        ...DEFAULT_THRESHOLD_SETTINGS,
        ...settings.thresholds,
      },
      rubricDefaults: {
        ...DEFAULT_RUBRIC_DEFAULTS,
        ...settings.rubricDefaults,
      },
    };
  } catch (err) {
    console.error("Unexpected error fetching teacher settings:", err);
    return null;
  }
};

// Update teacher profile (email cannot be updated)
export const updateTeacherProfile = async (
  profile: Partial<TeacherProfile>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher not found" };
    }

    // Don't allow email updates
    const { email, ...profileUpdate } = profile;
    if (email !== undefined) {
      console.warn("Email update attempted but not allowed");
    }

    // Combine first and last name into full_name
    let fullName = "";
    if (profile.firstName !== undefined || profile.lastName !== undefined) {
      const currentData = await supabase
        .from("teachers")
        .select("full_name")
        .eq("id", teacherId)
        .single();

      const currentFullName = currentData.data?.full_name || "";
      const currentParts = currentFullName.trim().split(/\s+/);
      const currentFirst = currentParts[0] || "";
      const currentLast = currentParts.slice(1).join(" ") || "";

      const firstName = profile.firstName !== undefined ? profile.firstName : currentFirst;
      const lastName = profile.lastName !== undefined ? profile.lastName : currentLast;
      fullName = `${firstName} ${lastName}`.trim();
    }

    const updateData: Record<string, unknown> = {};
    if (fullName) updateData.full_name = fullName;
    if (profile.institution !== undefined) {
      updateData.institution = profile.institution;
    }

    const { error } = await supabase
      .from("teachers")
      .update(updateData)
      .eq("id", teacherId);

    if (error) {
      console.error("Error updating teacher profile:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error updating teacher profile:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

// Update AI assessment settings
export const updateAIAssessmentSettings = async (
  settings: Partial<AIAssessmentSettings>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher not found" };
    }

    const { data: currentData, error: fetchError } = await supabase
      .from("teachers")
      .select("settings")
      .eq("id", teacherId)
      .single();

    if (fetchError || !currentData) {
      console.error("Error fetching current settings:", fetchError);
      return { success: false, error: fetchError?.message || "Failed to fetch settings" };
    }

    const currentSettings = (currentData as { settings?: TeacherSettings })?.settings || {};
    const updatedSettings: TeacherSettings = {
      ...currentSettings,
      aiAssessment: {
        ...DEFAULT_AI_ASSESSMENT_SETTINGS,
        ...currentSettings.aiAssessment,
        ...settings,
      },
    } as TeacherSettings;

    const { error } = await supabase
      .from("teachers")
      .update({ settings: updatedSettings })
      .eq("id", teacherId);

    if (error) {
      console.error("Error updating AI assessment settings:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error updating AI assessment settings:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

// Update threshold settings
export const updateThresholdSettings = async (
  settings: Partial<ThresholdSettings>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher not found" };
    }

    const { data: currentData, error: fetchError } = await supabase
      .from("teachers")
      .select("settings")
      .eq("id", teacherId)
      .single();

    if (fetchError || !currentData) {
      console.error("Error fetching current settings:", fetchError);
      return { success: false, error: fetchError?.message || "Failed to fetch settings" };
    }

    const currentSettings = (currentData as { settings?: TeacherSettings })?.settings || {};
    const updatedSettings: TeacherSettings = {
      ...currentSettings,
      thresholds: {
        ...DEFAULT_THRESHOLD_SETTINGS,
        ...currentSettings.thresholds,
        ...settings,
      },
    } as TeacherSettings;

    const { error } = await supabase
      .from("teachers")
      .update({ settings: updatedSettings })
      .eq("id", teacherId);

    if (error) {
      console.error("Error updating threshold settings:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error updating threshold settings:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

// Update rubric defaults
export const updateRubricDefaults = async (
  defaults: Partial<RubricDefaults>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher not found" };
    }

    const { data: currentData, error: fetchError } = await supabase
      .from("teachers")
      .select("settings")
      .eq("id", teacherId)
      .single();

    if (fetchError || !currentData) {
      console.error("Error fetching current settings:", fetchError);
      return { success: false, error: fetchError?.message || "Failed to fetch settings" };
    }

    const currentSettings = (currentData as { settings?: TeacherSettings })?.settings || {};
    const updatedSettings: TeacherSettings = {
      ...currentSettings,
      rubricDefaults: {
        ...DEFAULT_RUBRIC_DEFAULTS,
        ...currentSettings.rubricDefaults,
        ...defaults,
      },
    } as TeacherSettings;

    const { error } = await supabase
      .from("teachers")
      .update({ settings: updatedSettings })
      .eq("id", teacherId);

    if (error) {
      console.error("Error updating rubric defaults:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error updating rubric defaults:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

// Reset all settings to defaults
export const resetSettingsToDefaults = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher not found" };
    }

    // Get current profile to preserve it
    const profile = await fetchTeacherProfile();
    if (!profile) {
      return { success: false, error: "Failed to fetch current profile" };
    }

    const defaultSettings: TeacherSettings = {
      profile: {
        ...profile,
        // Email cannot be changed, so preserve it
      },
      aiAssessment: DEFAULT_AI_ASSESSMENT_SETTINGS,
      thresholds: DEFAULT_THRESHOLD_SETTINGS,
      rubricDefaults: DEFAULT_RUBRIC_DEFAULTS,
    };

    const { error } = await supabase
      .from("teachers")
      .update({ settings: defaultSettings })
      .eq("id", teacherId);

    if (error) {
      console.error("Error resetting settings:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error resetting settings:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

