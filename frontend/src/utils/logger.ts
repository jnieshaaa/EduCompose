import { supabase } from "../lib/supabaseClient";

export type LogAction = 
  | 'create_activity' 
  | 'update_activity' 
  | 'delete_activity'
  | 'grade_essay' 
  | 'batch_grade'
  | 'create_rubric' 
  | 'update_rubric'
  | 'delete_rubric'
  | 'create_student'
  | 'update_student'
  | 'login'
  | 'logout';

/**
 * Log an activity to the database
 * @param userId The ID of the user performing the action
 * @param action The type of action performed
 * @param description A human-readable description of the action
 * @param metadata Optional extra data (e.g., ID of the resource affected)
 */
export async function logActivity(
  userId: string | number,
  action: LogAction,
  description: string,
  metadata: any = {}
) {
  try {
    const { error } = await supabase
      .from("activity_logs")
      .insert({
        user_id: userId,
        action_type: action,
        description,
        metadata
      });

    if (error) {
       console.error("Logger error:", error.message);
    }
  } catch (err) {
    console.error("Critical logging failure:", err);
  }
}
