// Settings Service (Controller) - Handles all settings data operations

import { supabase } from "../lib/supabaseClient";
import type {
  TeacherProfile,
  TeacherSettings,
  AIAssessmentSettings,
  ThresholdSettings,
  RubricDefaults,
} from "../types/settingsTypes";
import {
  DEFAULT_AI_ASSESSMENT_SETTINGS,
  DEFAULT_THRESHOLD_SETTINGS,
  DEFAULT_RUBRIC_DEFAULTS,
} from "../types/settingsTypes";

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

// Fetch teacher profile data
export const fetchTeacherProfile = async (): Promise<TeacherProfile | null> => {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) return null;

    const { data, error } = await supabase
      .from("users")
      .select("email, full_name")
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
      institution: undefined, // Institution not available in users table yet
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
      .from("users")
      .select("email, full_name")
      .eq("id", teacherId)
      .single();

    if (error || !data) {
      console.error("Error fetching teacher settings:", error);
      return null;
    }

    const row = data as { email?: string; full_name?: string };
    const fullName = row.full_name || "";
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const institution = undefined;

    return {
      profile: {
        firstName,
        lastName,
        email: row.email || "",
        institution,
      },
      aiAssessment: DEFAULT_AI_ASSESSMENT_SETTINGS,
      thresholds: DEFAULT_THRESHOLD_SETTINGS,
      rubricDefaults: DEFAULT_RUBRIC_DEFAULTS,
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
    if (profile.email !== undefined) {
      console.warn("Email update attempted but not allowed");
    }

    // Combine first and last name into full_name
    let fullName = "";
    if (profile.firstName !== undefined || profile.lastName !== undefined) {
      const currentData = await supabase
        .from("users")
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
    // Institution not available in users table yet

    const { error } = await supabase
      .from("users")
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
  _settings: Partial<AIAssessmentSettings>
): Promise<{ success: boolean; error?: string }> => {
  // Settings not available in users table yet - return error
  void _settings; // Parameter required for API compatibility but not used
  return { success: false, error: "Settings feature not available yet. Users table needs settings column." };
};

// Update threshold settings
export const updateThresholdSettings = async (
  _settings: Partial<ThresholdSettings>
): Promise<{ success: boolean; error?: string }> => {
  // Settings not available in users table yet - return error
  void _settings; // Parameter required for API compatibility but not used
  return { success: false, error: "Settings feature not available yet. Users table needs settings column." };
};

// Update rubric defaults
export const updateRubricDefaults = async (
  _defaults: Partial<RubricDefaults>
): Promise<{ success: boolean; error?: string }> => {
  // Settings not available in users table yet - return error
  void _defaults; // Parameter required for API compatibility but not used
  return { success: false, error: "Settings feature not available yet. Users table needs settings column." };
};

// Reset all settings to defaults
export const resetSettingsToDefaults = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher not found" };
    }

    // Settings not available in users table yet
    return { success: false, error: "Settings feature not available yet. Users table needs settings column." };
  } catch (err) {
    console.error("Unexpected error resetting settings:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

