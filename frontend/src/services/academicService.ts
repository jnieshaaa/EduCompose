import { supabase } from "../lib/supabaseClient";

export interface AcademicSettings {
  id: string;
  ay_start: number;
  ay_end: number;
  current_semester: string;
  first_sem_start_month: string;
  first_sem_end_month: string;
  second_sem_start_month: string;
  second_sem_end_month: string;
  summer_start_month: string;
  summer_end_month: string;
}

export const fetchAcademicSettings = async (): Promise<AcademicSettings | null> => {
  try {
    const { data, error } = await supabase
      .from("academic_settings")
      .select("*")
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching academic settings:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("Unexpected error fetching academic settings:", err);
    return null;
  }
};

export const fetchAllAcademicSettings = async (): Promise<AcademicSettings[]> => {
  try {
    const { data, error } = await supabase
      .from("academic_settings")
      .select("*")
      .order('ay_start', { ascending: false });

    if (error) {
      console.error("Error fetching all academic settings:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Unexpected error fetching all academic settings:", err);
    return [];
  }
};

export const updateAcademicSettings = async (id: string, settings: Partial<AcademicSettings>) => {
  try {
    const { data, error } = await supabase
      .from("academic_settings")
      .update(settings)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error updating academic settings:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.error("Unexpected error updating academic settings:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
};

export const createAcademicSettings = async (settings: Partial<AcademicSettings>) => {
  try {
    const { data, error } = await supabase
      .from("academic_settings")
      .insert(settings)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error creating academic settings:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.error("Unexpected error creating academic settings:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
};

// FIX: title and nickname are in teacher_profiles, NOT in users table.
// Joining teacher_profiles!user_id and flattening the result.
export const fetchAllTeacherLoads = async (academicYear?: string, term?: string) => {
  try {
    let query = supabase
      .from("teacher_course_loads")
      .select(`
        id,
        academic_year,
        term,
        teacher_id,
        course_id,
        users!teacher_id (
          id,
          first_name,
          last_name,
          email,
          role,
          is_active,
          teacher_profiles!user_id (
            title,
            nickname
          )
        ),
        courses!course_id (
          course_code,
          course_title,
          units
        )
      `);

    if (academicYear) query = query.eq("academic_year", academicYear);
    if (term) query = query.eq("term", term);

    const { data, error } = await query.order('academic_year', { ascending: false });

    if (error) {
      console.error("Error fetching all teacher loads:", error);
      return [];
    }

    // Flatten teacher_profiles into the users object for easy access in components
    return (data || []).map((load: any) => ({
      ...load,
      users: load.users
        ? {
            ...load.users,
            title: load.users.teacher_profiles?.[0]?.title || null,
            nickname: load.users.teacher_profiles?.[0]?.nickname || null,
          }
        : null,
    }));
  } catch (err) {
    console.error("Unexpected error fetching loads:", err);
    return [];
  }
};

export const deleteTeacherCourseLoad = async (
  loadId: string,
  teacherId: string,
  courseTitle: string,
  reason: string
) => {
  try {
    // 1. Delete course load
    const { error: deleteError } = await supabase
      .from("teacher_course_loads")
      .delete()
      .eq("id", loadId);

    if (deleteError) {
      console.error("Error deleting course load:", deleteError);
      return { success: false, error: deleteError.message };
    }

    // 2. Insert Notification
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: teacherId,
        type: "course_removed",
        title: "Course Assignment Removed",
        message: `Your assignment for course ${courseTitle} has been removed. Reason: ${reason}`,
        read: false
      });

    if (notifError) {
      console.warn("Failed to send notification:", notifError);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error in deleteTeacherCourseLoad:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
};
