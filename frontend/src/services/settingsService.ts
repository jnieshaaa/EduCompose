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
      .eq("id", user.id)
      .maybeSingle();

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
      .select(
        "email, first_name, last_name, middle_name, suffix, title, nickname, school_id, department_id, schools(name), departments(name)"
      )
      .eq("id", teacherId)
      .maybeSingle();

    if (error || !data) {
      console.error("Error fetching teacher profile:", error);
      return null;
    }

    // Extract names from joined tables
    // @ts-ignore - Supabase types might not perfectly match the joined structure
    const schoolName = data.schools?.name || "";
    // @ts-ignore
    const departmentName = data.departments?.name || "";

    return {
      firstName: data.first_name || "",
      lastName: data.last_name || "",
      middleName: data.middle_name || "",
      suffix: data.suffix || "",
      title: data.title || "",
      nickname: data.nickname || "",
      school: data.school_id || "", // TeacherProfile interface probably expects the ID here
      schoolName: schoolName,
      department: data.department_id || "", // TeacherProfile interface expects ID
      departmentName: departmentName,
      email: data.email || "",
    };
  } catch (err) {
    console.error("Unexpected error fetching teacher profile:", err);
    return null;
  }
};

// Fetch all teacher settings
export const fetchTeacherSettings =
  async (): Promise<TeacherSettings | null> => {
    try {
      const teacherId = await getTeacherId();
      if (!teacherId) return null;

      const { data, error } = await supabase
        .from("users")
        .select(
          "email, first_name, last_name, middle_name, suffix, title, nickname, school_id, department_id, schools(name), departments(name)"
        )
        .eq("id", teacherId)
        .maybeSingle();

      if (error || !data) {
        console.error("Error fetching teacher settings:", error);
        return null;
      }

      // Extract names from joined tables
      // @ts-ignore
      const schoolName = data.schools?.name || "";
      // @ts-ignore
      const departmentName = data.departments?.name || "";

      return {
        profile: {
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          middleName: data.middle_name || "",
          suffix: data.suffix || "",
          title: data.title || "",
          nickname: data.nickname || "",
          school: data.school_id || "",
          schoolName: schoolName,
          department: data.department_id || "",
          departmentName: departmentName,
          email: data.email || "",
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
  profile: Partial<TeacherProfile>,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher not found" };
    }

    // Email updates are not supported via this profile update method
    // to prevent accidental lockouts or unauthorized changes.

    // Get current data to merge
    const { data: currentData, error: fetchError } = await supabase
      .from("users")
      .select(
        "first_name, last_name, middle_name, title, nickname, suffix, school_id, department_id",
      )
      .eq("id", teacherId)
      .maybeSingle();

    if (fetchError || !currentData) {
      console.error("Error fetching current data:", fetchError || "User not found");
      return { success: false, error: fetchError?.message || "User profiling record not found" };
    }

    const updateData: Record<string, unknown> = {};

    if (profile.firstName !== undefined)
      updateData.first_name = profile.firstName;
    if (profile.lastName !== undefined) updateData.last_name = profile.lastName;
    if (profile.middleName !== undefined)
      updateData.middle_name = profile.middleName;
    if (profile.suffix !== undefined) updateData.suffix = profile.suffix;
    if (profile.title !== undefined) updateData.title = profile.title;
    if (profile.nickname !== undefined) updateData.nickname = profile.nickname;
    if (profile.school !== undefined) updateData.school_id = profile.school;
    if (profile.department !== undefined)
      updateData.department_id = profile.department;

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
  _settings: Partial<AIAssessmentSettings>,
): Promise<{ success: boolean; error?: string }> => {
  // Settings not available in users table yet - return error
  void _settings; // Parameter required for API compatibility but not used
  return {
    success: false,
    error:
      "Settings feature not available yet. Users table needs settings column.",
  };
};

// Update threshold settings
export const updateThresholdSettings = async (
  _settings: Partial<ThresholdSettings>,
): Promise<{ success: boolean; error?: string }> => {
  // Settings not available in users table yet - return error
  void _settings; // Parameter required for API compatibility but not used
  return {
    success: false,
    error:
      "Settings feature not available yet. Users table needs settings column.",
  };
};

// Update rubric defaults
export const updateRubricDefaults = async (
  _defaults: Partial<RubricDefaults>,
): Promise<{ success: boolean; error?: string }> => {
  // Settings not available in users table yet - return error
  void _defaults; // Parameter required for API compatibility but not used
  return {
    success: false,
    error:
      "Settings feature not available yet. Users table needs settings column.",
  };
};

// Reset all settings to defaults
export const resetSettingsToDefaults = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const teacherId = await getTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher not found" };
    }

    // Settings not available in users table yet
    return {
      success: false,
      error:
        "Settings feature not available yet. Users table needs settings column.",
    };
  } catch (err) {
    console.error("Unexpected error resetting settings:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};
