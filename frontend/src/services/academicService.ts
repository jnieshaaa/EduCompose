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
      .single();

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

export const updateAcademicSettings = async (id: string, settings: Partial<AcademicSettings>) => {
  try {
    const { data, error } = await supabase
      .from("academic_settings")
      .update(settings)
      .eq("id", id)
      .select()
      .single();

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
          first_name,
          last_name,
          email,
          role
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
    return data;
  } catch (err) {
    console.error("Unexpected error fetching loads:", err);
    return [];
  }
};
