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
      .select(`
        email, first_name, last_name, middle_name, suffix,
        teacher_profiles!user_id (
          title, 
          nickname, 
          school_id, 
          department_id, 
          schools:school_id(name), 
          departments:department_id(name)
        )
      `)
      .eq("id", teacherId)
      .maybeSingle();

    if (error || !data) {
      console.error("Error fetching teacher profile:", error);
      return null;
    }

    const profileData = Array.isArray(data.teacher_profiles) ? data.teacher_profiles[0] : data.teacher_profiles;

    return {
      firstName: data.first_name || "",
      lastName: data.last_name || "",
      middleName: data.middle_name || "",
      suffix: data.suffix || "",
      title: profileData?.title || "",
      nickname: profileData?.nickname || "",
      school: profileData?.school_id || "",
      schoolName: (Array.isArray(profileData?.schools) ? profileData?.schools[0]?.name : (profileData?.schools as any)?.name) || "",
      department: profileData?.department_id || "",
      departmentName: (Array.isArray(profileData?.departments) ? profileData?.departments[0]?.name : (profileData?.departments as any)?.name) || "",
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
        .select(`
          email, first_name, last_name, middle_name, suffix,
          teacher_profiles!user_id (
            title, 
            nickname, 
            school_id, 
            department_id, 
            schools:school_id(name), 
            departments:department_id(name)
          )
        `)
        .eq("id", teacherId)
        .maybeSingle();

      if (error || !data) {
        console.error("Error fetching teacher settings:", error);
        return null;
      }

      const profileData = Array.isArray(data.teacher_profiles) ? data.teacher_profiles[0] : data.teacher_profiles;

      return {
        profile: {
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          middleName: data.middle_name || "",
          suffix: data.suffix || "",
          title: profileData?.title || "",
          nickname: profileData?.nickname || "",
          school: profileData?.school_id || "",
          schoolName: (Array.isArray(profileData?.schools) ? profileData?.schools[0]?.name : (profileData?.schools as any)?.name) || "",
          department: profileData?.department_id || "",
          departmentName: (Array.isArray(profileData?.departments) ? profileData?.departments[0]?.name : (profileData?.departments as any)?.name) || "",
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

    const userUpdate: Record<string, unknown> = {};
    const profileUpdate: Record<string, unknown> = {};

    if (profile.firstName !== undefined) userUpdate.first_name = profile.firstName;
    if (profile.lastName !== undefined) userUpdate.last_name = profile.lastName;
    if (profile.middleName !== undefined) userUpdate.middle_name = profile.middleName;
    if (profile.suffix !== undefined) userUpdate.suffix = profile.suffix;

    if (profile.title !== undefined) profileUpdate.title = profile.title;
    if (profile.nickname !== undefined) profileUpdate.nickname = profile.nickname;
    if (profile.school !== undefined) profileUpdate.school_id = profile.school;
    if (profile.department !== undefined) profileUpdate.department_id = profile.department;

    if (Object.keys(userUpdate).length > 0) {
      const { error: userError } = await supabase.from("users").update(userUpdate).eq("id", teacherId);
      if (userError) {
        console.error("Error updating user record:", userError);
        return { success: false, error: userError.message };
      }
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profError } = await supabase.from("teacher_profiles").update(profileUpdate).eq("user_id", teacherId);
      if (profError) {
        console.error("Error updating teacher profile:", profError);
        return { success: false, error: profError.message };
      }
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
