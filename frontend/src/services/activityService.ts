// Activity service for data operations

import { supabase } from "../lib/supabaseClient";
import { getErrorMessage } from "../utils/errorUtils";
import type { EssayActivity, NewActivityForm } from "../types/activityTypes";
import { fetchTeacherId, fetchTeacherUUID } from "./rubricService";
import { buildFullNameFromObject } from "../utils/nameUtils";

/** Essay / student / activity IDs may be UUID strings or legacy integers in some deployments. */
export function isUuidString(value: string): boolean {
  const t = value.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
  if (!isUuid && t.length > 10) {
    console.log("[isUuidString] Testing value:", `"${t}"`, "Result:", isUuid);
  }
  return isUuid;
}

export function coerceEssayIdParam(id: string | null | undefined): string | null {
  if (id == null) return null;
  const s = id.trim();
  return s || null;
}

/** Results of comparing multiple essays. */
export interface ComparisonAnalysis {
  id?: string;
  activityId: string;
  studentIds: string[];
  essayIds: string[];
  insights: string;
  highlights: any;
  similarityScore: number;
  createdAt?: string;
}

/** Resolve `students.id` for `essays.student_id` filters: UUID pass-through, else `student_code` lookup. */
export async function resolveStudentIdForEssayFilter(
  rawStudentId: string,
): Promise<string | null> {
  const t = rawStudentId.trim();
  if (!t) return null;
  if (isUuidString(t)) return t;

  try {
    const { data: byCode, error: lookupError } = await supabase
      .from("users")
      .select("*")
      .eq("student_code", t)
      .eq("role", "student")
      .maybeSingle();
    
    if (lookupError) {
      console.error("[resolveStudentIdForEssayFilter] Supabase Error:", {
        message: lookupError.message,
        details: lookupError.details,
        hint: lookupError.hint,
        code: lookupError.code,
        queryValue: t
      });
      return null;
    }
    
    return byCode?.id || null;
  } catch (err) {
    console.error("[resolveStudentIdForEssayFilter] Unexpected error in lookup:", err);
    return null;
  }
}


/** Resolve activity id for `essays.activity_id` filters. */
export function resolveActivityIdForEssayFilter(
  rawActivityId: string,
): string | null {
  const t = rawActivityId.trim();
  if (!t) return null;
  return t; // Activities are always UUIDs now
}

/** Look up `essays.id` from route/ref `studentId` + `activityId` strings. */
export async function resolveEssayIdFromStudentActivity(
  studentId: string,
  activityId: string,
): Promise<string | null> {
  const sid = await resolveStudentIdForEssayFilter(studentId);
  const aid = resolveActivityIdForEssayFilter(activityId);
  if (sid == null || aid == null) return null;
  const { data } = await supabase
    .from("essays")
    .select("id")
    .eq("student_id", sid)
    .eq("activity_id", aid)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Fetches necessary information to build a full breadcrumb and navigation context.
 */
export const fetchActivityBreadcrumbInfo = async (
  activityId: string,
  studentId?: string,
  essayId?: string,
) => {
  try {
    const actId = activityId.trim();
    if (!actId) return null;

    // 1. Fetch Activity Basic Info
    const { data: activity, error: actErr } = await supabase
      .from("essay_activities")
      .select("id, title, program_id, course_id, block_id")
      .eq("id", actId)
      .single();

    if (actErr || !activity) return null;

    let programAbbr = "";
    let courseName = "";
    let sectionId = "";
    let courseSectionName = "";
    let courseId = "";

    // 2. Resolve Program Abbr
    if (activity.program_id && activity.program_id.length > 0) {
      const pId = Array.isArray(activity.program_id)
        ? activity.program_id[0]
        : activity.program_id;
      const { data: prog } = await supabase
        .from("programs_lookup")
        .select("abbr")
        .eq("id", pId)
        .single();
      if (prog) programAbbr = prog.abbr;
    }

    // 3. Resolve Course Info
    if (activity.course_id && activity.course_id.length > 0) {
      courseId = Array.isArray(activity.course_id)
        ? activity.course_id[0]
        : activity.course_id;
      const { data: course } = await supabase
        .from("courses")
        .select("course_title, course_code")
        .eq("id", courseId)
        .single();
      if (course) courseName = course.course_title || course.course_code;
    }

    // 4. Resolve Section/Block Info (if targeted)
    if (essayId) {
      const { data: essay } = await supabase
        .from("essays")
        .select("block_id")
        .eq("id", essayId)
        .single();
      if (essay && essay.block_id) sectionId = String(essay.block_id);
    } else if (studentId) {
      // Find which block this student is assigned to for this activity
      // or just their primary block matching the activity's blocks
      if (activity.block_id && activity.block_id.length > 0) {
        const { data: enrollment } = await supabase
          .from("block_students")
          .select("block_id")
          .eq("student_id", studentId)
          .in("block_id", activity.block_id)
          .maybeSingle();

        if (enrollment) sectionId = String(enrollment.block_id);
      }
    }

    // If sectionId was found, get its friendly name
    if (sectionId) {
      const { data: block } = await supabase
        .from("blocks")
        .select("year, name")
        .eq("id", sectionId)
        .single();
      if (block) courseSectionName = `${block.year}${block.name}`;
    }

    return {
      activityId: activity.id,
      activityTitle: activity.title,
      programAbbr,
      courseName,
      courseId,
      sectionId,
      courseSection: courseSectionName,
    };
  } catch (err) {
    console.error("Error fetching breadcrumb/navigation info:", err);
    return null;
  }
};

// Supabase row type for essay_activities
type SupabaseActivityRow = {
  id: string;
  teacher_id: string | null;
  title: string;
  program_id: string[] | null;
  block_id: string | null;
  course_id: string | null;
  rubric_id: string | null;
  due_date: string | null;
  instructions: string | null;
  academic_year: string | null;
  term: string | null;
  min_word_count: number;
  created_at: string;
  rubrics?:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
};

// Load activities for the current teacher with optional academic context filtering
export const fetchTeacherActivities = async (
  academicYear?: string,
  term?: string,
  showArchived: boolean = false,
  currentAY?: string,
  currentTerm?: string,
  teacherIdArg?: string,
): Promise<EssayActivity[]> => {
  try {
    let teacherId: string | null | undefined = teacherIdArg;
    if (!teacherId) {
      teacherId = await fetchTeacherUUID();
    }
    if (!teacherId) {
      console.error("Teacher UUID not available");
      return [];
    }

    // Fetch activities with rubric names
    let query = supabase
      .from("essay_activities")
      .select(
        "id, teacher_id, title, program_id, block_id, course_id, rubric_id, academic_year, term, due_date, instructions, min_word_count, created_at, rubrics(id, name)",
      )
      .eq("teacher_id", teacherId);

    if (!showArchived) {
      if (academicYear && academicYear !== "all")
        query = query.eq("academic_year", academicYear);
      if (term && term !== "all") query = query.eq("term", term);
    } else {
      // Archive view: apply specific filters
      if (academicYear && academicYear !== "all")
        query = query.eq("academic_year", academicYear);
      if (term && term !== "all") query = query.eq("term", term);

      // But ALWAYS exclude the current context if provided
      if (currentAY && currentTerm) {
        query = query.or(
          `academic_year.neq.${currentAY},term.neq.${currentTerm}`,
        );
      }
    }

    const { data: activitiesData, error: activitiesError } = await query.order(
      "created_at",
      { ascending: false },
    );

    if (activitiesError) {
      console.error("Error loading activities:", activitiesError);
      return [];
    }

    if (!activitiesData || activitiesData.length === 0) {
      return [];
    }

    // Get activity IDs to fetch submission counts
    const activityIds = activitiesData.map((a) => a.id);

    // Fetch submission counts for each activity
    const { data: submissionsData, error: submissionsError } = await supabase
      .from("essays")
      .select("activity_id")
      .in("activity_id", activityIds);

    if (submissionsError) {
      console.error("Error loading submission counts:", submissionsError);
    }

    // Count submissions per activity
    const submissionCounts = new Map<string, number>();
    if (submissionsData) {
      submissionsData.forEach((submission) => {
        if (submission.activity_id) {
          const sId = String(submission.activity_id);
          const count = submissionCounts.get(sId) || 0;
          submissionCounts.set(sId, count + 1);
        }
      });
    }

    // Map Supabase rows to EssayActivity format
    const mappedActivities: EssayActivity[] = (
      activitiesData as unknown as SupabaseActivityRow[]
    ).map((row) => ({
      id: String(row.id),
      title: row.title,
      courseId: row.course_id ? String(row.course_id) : "all",
      courseIds: row.course_id ? [String(row.course_id)] : [],
      blockId: row.block_id ? String(row.block_id) : "all",
      blockIds: row.block_id ? [String(row.block_id)] : [],
      rubricId: row.rubric_id ? String(row.rubric_id) : null,
      term: row.term || undefined,
      description: row.instructions || undefined,
      minWordCount: row.min_word_count || 150,
      createdAt: row.created_at.split("T")[0], // Extract date part
      submissionCount: submissionCounts.get(String(row.id)) || 0,
      programId:
        Array.isArray(row.program_id) && row.program_id.length > 0
          ? String(row.program_id[0])
          : undefined,
      programIds: Array.isArray(row.program_id)
        ? row.program_id.map(String)
        : [],
    }));

    return mappedActivities;
  } catch (err) {
    console.error("Unexpected error loading activities:", err);
    return [];
  }
};

// Initialize/sync all platform rubrics to Supabase database
// This ensures all platform rubrics are available in the database
// Returns the number of rubrics successfully synced
export const initializePlatformRubrics = async (): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const isAdmin = user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin';
    
    if (!isAdmin) {
      // Non-admins shouldn't try to initialize global rubrics (RLS will block anyway)
      return 0;
    }

    const { platformRubrics } = await import("../data/rubricData");

    // Get all existing platform rubrics from database
    // A rubric is a "platform rubric" if user_id is null OR if the owner is an admin
    const { data: allRubrics, error: fetchError } = await supabase
      .from("rubrics")
      .select("id, name, user_id, owner:users!user_id(role)");

    if (fetchError) {
      console.error("Error fetching rubrics for sync:", fetchError);
      return 0;
    }

    const existingNames = new Set(
      (allRubrics || [])
        .filter((r: any) => r.user_id === null || r.owner?.role === "admin")
        .map((r: any) => r.name.toLowerCase()),
    );

    let syncedCount = 0;
    // Sync each platform rubric
    for (const template of platformRubrics) {
      // Check if a platform rubric with this name already exists
      const exists = existingNames.has(template.name.toLowerCase());

      if (!exists) {
        // Insert platform rubric (database will assign ID automatically)
        const { data: newRubric, error } = await supabase
          .from("rubrics")
          .insert({
            name: template.name,
            description: template.description || "",
            criteria: template.criteria,
            programs: [], // Platform rubrics don't have specific programs
            grading_intensity: template.type || "Basic",
            user_id: null, // Platform rubric
          })
          .select("id")
          .single();

        if (error) {
          console.error(
            `Error creating platform rubric "${template.name}":`,
            error,
          );
        } else {
          console.log(
            `Synced platform rubric "${template.name}" with database ID ${newRubric.id}`,
          );
          syncedCount++;
        }
      } else {
        // Already exists, count as synced
        syncedCount++;
      }
    }

    return syncedCount;
  } catch (err) {
    console.error("Error initializing platform rubrics:", err);
    return 0;
  }
};

// Helper function to ensure platform rubric exists in database
// Since platform rubrics are now synced via initializePlatformRubrics,
// we find them by name (database IDs are different from template IDs)
const ensurePlatformRubricExists = async (
  templateId: string,
): Promise<string | null> => {
  try {
    // Only admins can ensure/seed platform rubrics
    const { data: { user } } = await supabase.auth.getUser();
    const isAdmin = user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin';
    
    // Import template to get the name
    const { platformRubrics } = await import("../data/rubricData");
    const template = platformRubrics.find((r) => String(r.id) === templateId);

    if (!template) {
      console.warn(`Template rubric with ID ${templateId} not found`);
      return null;
    }

    // Find platform rubric by name
    // A platform rubric is one where user_id is null OR the owner is an admin
    const { data: rubricsWithName } = await supabase
      .from("rubrics")
      .select("id, user_id, owner:users!user_id(role)")
      .eq("name", template.name);

    // Find the one that's a platform rubric
    const existing = rubricsWithName?.find(
      (r: any) => r.user_id === null || r.owner?.role === "admin",
    );

    if (existing) {
      return existing.id;
    }

    // If not found and user is admin, create it
    if (isAdmin) {
      const { data: newRubric, error: insertError } = await supabase
        .from("rubrics")
        .insert({
          name: template.name,
          description: template.description || "",
          criteria: template.criteria,
          grading_intensity: template.type || "Basic",
          user_id: null, // Platform rubric
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error creating platform rubric:", insertError);
        return null;
      }

      console.log(
        `Created platform rubric "${template.name}" with database ID ${newRubric.id}`,
      );
      return newRubric.id;
    }

    // If not found and not admin, we can't create it, so return null
    return null;
  } catch (err) {
    console.error("Error ensuring platform rubric exists:", err);
    return null;
  }
};

// Create a new activity
export const createActivity = async (
  activity: NewActivityForm,
): Promise<EssayActivity[]> => {
  try {
    const teacherUUID = await fetchTeacherUUID();
    const teacherId = await fetchTeacherId(); // Get UUID for standardized schema
    if (!teacherUUID || !teacherId) {
      throw new Error("Teacher identification not available");
    }

    // For now, store first selected course/section or null if empty (meaning "all")

    // Handle rubric ID
    let rubricId: string | null = activity.rubricId || null;

    // 1. If there's an AI suggested rubric, save it first (only if rubricId is 'ai-suggestion')
    if (activity.suggestedRubric && activity.rubricId === "ai-suggestion") {
      const { data: newRubric, error: rubricError } = await supabase
        .from("rubrics")
        .insert({
          name: activity.suggestedRubric.name,
          description: activity.suggestedRubric.description,
          criteria: activity.suggestedRubric.criteria,
          grading_intensity: activity.suggestedRubric.grading_intensity,
          user_id: teacherId, // AI generated rubrics go to teacher's private list
        })
        .select("id")
        .single();
      
      if (rubricError) {
        console.error("Error saving suggested rubric:", rubricError);
      } else if (newRubric) {
        rubricId = newRubric.id;
      }
    } else if (rubricId && rubricId.startsWith("platform-")) {
      // 2. If it's a template ID, ensure it exists as a platform rubric (user_id: null)
      const templateId = rubricId.replace("platform-", "");
      if (templateId) {
        const resultId = await ensurePlatformRubricExists(templateId);
        rubricId = resultId;
      }
    }
    // 3. Otherwise, use the rubricId as is (it's already a DB ID, either platform or private)

    const blockToProgram = new Map<string, string | null>();
    const studentIdsByBlock = new Map<string, string[]>();

    // 1. Fetch program ID for each block (needed for insertion and grouping)
    if (activity.sectionIds.length > 0) {
      const { data: blocksData } = await supabase
        .from("blocks")
        .select(
          `
          id,
          teacher_program_loads (
            program_id
          )
        `,
        )
        .in("id", activity.sectionIds);

      if (blocksData) {
        blocksData.forEach((b: {
          id: string;
          teacher_program_loads:
            | { program_id?: string | null }
            | Array<{ program_id?: string | null }>
            | null;
        }) => {
          const tpl = Array.isArray(b.teacher_program_loads)
            ? b.teacher_program_loads[0]
            : b.teacher_program_loads;

          blockToProgram.set(b.id, tpl?.program_id || null);
        });
      }

      // 2. Fetch all student user IDs for notifications, grouped by block
      const { data: studentsData, error: studentError } = await supabase
        .from("block_students")
        .select(
          `
          block_id,
          users!student_id (
            id
          )
        `,
        )
        .in("block_id", activity.sectionIds);

      if (studentError) {
        console.error(
          "Error fetching students for notification:",
          studentError,
        );
      }

      if (studentsData && studentsData.length > 0) {
        studentsData.forEach((row: {
          block_id: string | null;
          users?:
            | { id?: string | null }
            | Array<{ id?: string | null }>
            | null;
        }) => {
          const authId = Array.isArray(row.users)
            ? row.users[0]?.id
            : row.users?.id;
          if (authId && row.block_id) {
            if (!studentIdsByBlock.has(row.block_id)) {
              studentIdsByBlock.set(row.block_id, []);
            }
            studentIdsByBlock.get(row.block_id)?.push(authId);
          }
        });
      }
    }

    // 3. Create a single activity record with array columns
    const activityToInsert = {
      teacher_id: teacherId,
      title: activity.title.trim(),
      course_id: activity.courseIds?.[0] || null,
      block_id: activity.sectionIds?.[0] || null,
      program_id: Array.from(
        new Set(Array.from(blockToProgram.values()).filter(Boolean)),
      ),
      rubric_id: rubricId,
      due_date: activity.dueDate || null,
      instructions: activity.description || null,
      min_word_count: activity.minWordCount || 150,
      academic_year: activity.academicYear || null,
      term: activity.term || null,
    };

    const { data, error } = await supabase
      .from("essay_activities")
      .insert(activityToInsert)
      .select();

    if (error) {
      console.error("Error creating activity:", error);
      throw error;
    }

    // 4. Send notifications to students for each block assigned
    if (data && data.length > 0) {
      const newActivity = data[0];
      const notificationsToInsert: Array<{
        user_id: string;
        type: "new_activity";
        title: string;
        message: string;
        related_id: string;
        related_type: "essay_activities";
      }> = [];

      activity.sectionIds.forEach((blockId) => {
        const targetStudentIds = studentIdsByBlock.get(blockId) || [];

        targetStudentIds.forEach((studentUserId) => {
          notificationsToInsert.push({
            user_id: studentUserId,
            type: "new_activity",
            title: "New Activity Assigned",
            message: `A new activity "${activity.title.trim()}" has been posted.`,
            related_id: newActivity.id,
            related_type: "essay_activities",
          });
        });
      });

      if (notificationsToInsert.length > 0) {
        supabase
          .from("notifications")
          .insert(notificationsToInsert)
          .then(({ error: notifyError }) => {
            if (notifyError) {
              console.error("Failed to notify students:", notifyError);
            }
          });
      }
    }

    // Map back created activity to EssayActivity formats
    return (data as SupabaseActivityRow[]).map((row) => ({
      id: String(row.id),
      title: row.title,
      courseId: row.course_id ? String(row.course_id) : "all",
      courseIds: row.course_id ? [String(row.course_id)] : [],
      blockId: row.block_id ? String(row.block_id) : "all",
      blockIds: row.block_id ? [String(row.block_id)] : [],
      rubricId: row.rubric_id ? String(row.rubric_id) : null,
      dueDate: row.due_date || undefined,
      description: row.instructions || undefined,
      minWordCount: row.min_word_count || 150,
      createdAt: row.created_at
        ? row.created_at.split("T")[0]
        : new Date().toISOString().split("T")[0],
      submissionCount: 0,
      academicYear: row.academic_year || undefined,
      term: row.term || undefined,
      programId:
        Array.isArray(row.program_id) && row.program_id.length > 0
          ? String(row.program_id[0])
          : undefined,
      programIds: Array.isArray(row.program_id)
        ? row.program_id.map(String)
        : [],
    }));
  } catch (err) {
    console.error("Unexpected error creating activity:", err);
    throw err;
  }
};

// Update an activity
export const updateActivity = async (
  activityId: string,
  activityData: NewActivityForm,
): Promise<EssayActivity> => {
  try {
    const teacherId = await fetchTeacherUUID();
    if (!teacherId) {
      throw new Error("Teacher UUID not available");
    }

    const id = activityId.trim();
    if (!id) {
      throw new Error("Invalid activity ID");
    }

    // Get first selected program/section or null

    // Handle rubric ID
    let rubricId: string | null = activityData.rubricId || null;

    // 1. If there's an AI suggested rubric, save it first (only if rubricId is 'ai-suggestion')
    if (activityData.suggestedRubric && activityData.rubricId === "ai-suggestion") {
      const { data: newRubric, error: rubricError } = await supabase
        .from("rubrics")
        .insert({
          name: activityData.suggestedRubric.name,
          description: activityData.suggestedRubric.description,
          criteria: activityData.suggestedRubric.criteria,
          grading_intensity: activityData.suggestedRubric.grading_intensity,
          user_id: teacherId, // AI generated rubrics go to teacher's private list
        })
        .select("id")
        .single();
      
      if (rubricError) {
        console.error("Error saving suggested rubric during update:", rubricError);
      } else if (newRubric) {
        rubricId = newRubric.id;
      }
    } else if (rubricId && rubricId.startsWith("platform-")) {
      // 2. If it's a template ID, ensure it exists as a platform rubric (user_id: null)
      const templateId = rubricId.replace("platform-", "");
      if (templateId) {
        const resultId = await ensurePlatformRubricExists(templateId);
        rubricId = resultId;
      }
    }
    // 3. Otherwise, use the rubricId as is (it's already a DB ID, either platform or private)

    const updateData: Record<string, unknown> = {
      title: activityData.title,
      course_id: activityData.courseIds?.[0] || null,
      block_id: activityData.sectionIds?.[0] || null,
      rubric_id: rubricId,
      due_date: activityData.dueDate || null,
      instructions: activityData.description || null,
      min_word_count: activityData.minWordCount || 150,
      academic_year: activityData.academicYear,
      term: activityData.term,
      program_id: null, // Will be set below if sections are selected
    };

    // If sections selected, try to update program_id array from the blocks
    if (activityData.sectionIds.length > 0) {
      const { data: blocksData } = await supabase
        .from("blocks")
        .select("teacher_program_loads(program_id)")
        .in("id", activityData.sectionIds);

      if (blocksData) {
        const programIds = new Set<string>();
        blocksData.forEach((b: {
          teacher_program_loads:
            | { program_id?: string | null }
            | Array<{ program_id?: string | null }>
            | null;
        }) => {
          const tpl = Array.isArray(b.teacher_program_loads)
            ? b.teacher_program_loads[0]
            : b.teacher_program_loads;
          if (tpl?.program_id) programIds.add(tpl.program_id);
        });
        updateData.program_id = Array.from(programIds);
      }
    }

    const { data, error } = await supabase
      .from("essay_activities")
      .update(updateData)
      .eq("id", id)
      .eq("teacher_id", teacherId)
      .select()
      .single();

    if (error) {
      console.error("Error updating activity:", error);
      throw error;
    }

    // Map back to EssayActivity format
    const row = data as unknown as SupabaseActivityRow;
    return {
      id: String(row.id),
      title: row.title,
      courseId: row.course_id ? String(row.course_id) : "all",
      courseIds: row.course_id ? [String(row.course_id)] : [],
      blockId: row.block_id ? String(row.block_id) : "all",
      blockIds: row.block_id ? [String(row.block_id)] : [],
      rubricId: row.rubric_id ? String(row.rubric_id) : null,
      dueDate: row.due_date || undefined,
      description: row.instructions || undefined,
      createdAt: row.created_at.split("T")[0],
      academicYear: row.academic_year || undefined,
      term: row.term || undefined,
      submissionCount: 0, // Will be updated when activities are reloaded
      programId:
        Array.isArray(row.program_id) && row.program_id.length > 0
          ? String(row.program_id[0])
          : undefined,
      programIds: Array.isArray(row.program_id)
        ? row.program_id.map(String)
        : [],
    };
  } catch (err) {
    console.error("Unexpected error updating activity:", err);
    throw err;
  }
};

// Delete an activity
export const deleteActivity = async (activityId: string): Promise<void> => {
  try {
    const id = activityId.trim();
    if (!id) {
      throw new Error("Invalid activity ID");
    }

    const { error } = await supabase
      .from("essay_activities")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting activity:", error);
      throw error;
    }
  } catch (err) {
    console.error("Unexpected error deleting activity:", err);
    throw err;
  }
};

// Load courses for the current teacher (only those they are actually teaching)
export const fetchCourses = async (teacherId?: string): Promise<
  { id: string; course_code: string; course_title: string }[]
> => {
  try {
    let finalTeacherId: string | null | undefined = teacherId;
    if (!finalTeacherId) {
      const { data: userData } = await supabase.auth.getUser();
      finalTeacherId = userData?.user?.id;
    }
    if (!finalTeacherId) return [];

    // Fetch courses through teacher_course_loads
    const { data, error } = await supabase
      .from("teacher_course_loads")
      .select("courses(id, course_code, course_title)")
      .eq("teacher_id", finalTeacherId);

    if (error) {
      console.error("Error loading teacher courses:", error);
      return [];
    }

    const courses = (data || [])
      .flatMap((l: {
        courses:
          | Array<{
              id: string;
              course_code: string;
              course_title: string;
            }>
          | null;
      }) => l.courses || []);

    // Remove duplicates
    const uniqueCourses = Array.from(
      new Map(courses.map((c) => [c.id, c])).values(),
    );

    return uniqueCourses
      .map((c) => ({
        id: String(c.id),
        course_code: c.course_code,
        course_title: c.course_title,
      }))
      .sort((a, b) =>
      a.course_code.localeCompare(b.course_code),
      );
  } catch (err) {
    console.error("Unexpected error loading courses:", err);
    return [];
  }
};

// Load program loads for the current teacher, optionally filtered by course
export const fetchTeacherProgramLoads = async (
  courseId?: string,
  teacherId?: string
): Promise<
  { id: string; program_id: string; program_name: string; course_id: string }[]
> => {
  try {
    let finalTeacherId: string | null | undefined = teacherId;
    if (!finalTeacherId) {
      const { data: userData } = await supabase.auth.getUser();
      finalTeacherId = userData?.user?.id;
    }
    if (!finalTeacherId) return [];

    let query = supabase
      .from("teacher_program_loads")
      .select(
        `
        id,
        program_id,
        programs_lookup(name, abbr),
        teacher_course_loads!inner(course_id)
      `,
      )
      .eq("teacher_course_loads.teacher_id", finalTeacherId);

    if (courseId && courseId !== "all") {
      query = query.eq("teacher_course_loads.course_id", courseId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading program loads:", error);
      return [];
    }

    return (data || []).map(
      (row: {
        id: string;
        program_id: string;
        programs_lookup?:
          | Array<{ name?: string | null; abbr?: string | null }>
          | { name?: string | null; abbr?: string | null }
          | null;
        teacher_course_loads?:
          | Array<{ course_id?: string | null }>
          | { course_id?: string | null }
          | null;
      }) => ({
        // Supabase nested joins can be array/object depending on relation metadata.
        // Normalize both shapes before reading fields.
        ...(() => {
          const program = Array.isArray(row.programs_lookup)
            ? row.programs_lookup[0]
            : row.programs_lookup;
          const courseLoad = Array.isArray(row.teacher_course_loads)
            ? row.teacher_course_loads[0]
            : row.teacher_course_loads;
          return {
            id: String(row.id),
            program_id: String(row.program_id),
            program_name: program?.abbr || program?.name || "Unknown Program",
            course_id: String(courseLoad?.course_id || ""),
          };
        })(),
      }),
    );
  } catch (err) {
    console.error("Unexpected error loading program loads:", err);
    return [];
  }
};

// Load programs for dropdown
export const fetchPrograms = async (): Promise<
  { id: string; name: string }[]
> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      return [];
    }

    const { data, error } = await supabase
      .from("programs_lookup")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading programs:", error);
      return [];
    }

    return (data || []).map((p) => ({
      id: String(p.id),
      name: p.name,
    }));
  } catch (err) {
    console.error("Unexpected error loading programs:", err);
    return [];
  }
};

// Load sections (blocks) for dropdown, optionally filtered by program load
export const fetchSections = async (
  programLoadId?: string,
  teacherId?: string,
): Promise<
  { id: string; name: string; courseId: string; programLoadId: string }[]
> => {
  try {
    let finalTeacherId: string | null | undefined = teacherId;
    if (!finalTeacherId) {
      const { data: userData } = await supabase.auth.getUser();
      finalTeacherId = userData?.user?.id;
    }
    if (!finalTeacherId) return [];

    let query = supabase
      .from("blocks")
      .select(
        `
        id,
        name,
        year,
        program_load_id,
        teacher_program_loads!fk_block_program_load!inner (
          programs_lookup (
            name,
            abbr
          ),
          course_load_id,
          teacher_course_loads!inner (
            course_id
          )
        )
      `,
      )
      .eq("teacher_id", finalTeacherId);

    if (programLoadId && programLoadId !== "all") {
      query = query.eq("program_load_id", programLoadId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading sections:", error);
      return [];
    }

    return (data || []).map((block: {
      id: string;
      year?: number | null;
      name: string;
      program_load_id: string | null;
      teacher_program_loads?:
        | Array<{
            programs_lookup?:
              | Array<{ abbr?: string | null; name?: string | null }>
              | { abbr?: string | null; name?: string | null }
              | null;
            teacher_course_loads?:
              | Array<{ course_id?: string | null }>
              | { course_id?: string | null }
              | null;
          }>
        | {
            programs_lookup?:
              | Array<{ abbr?: string | null; name?: string | null }>
              | { abbr?: string | null; name?: string | null }
              | null;
            teacher_course_loads?:
              | Array<{ course_id?: string | null }>
              | { course_id?: string | null }
              | null;
          }
        | null;
    }) => {
      const programLoad = Array.isArray(block.teacher_program_loads)
        ? block.teacher_program_loads[0]
        : block.teacher_program_loads;
      const program = Array.isArray(programLoad?.programs_lookup)
        ? programLoad?.programs_lookup[0]
        : programLoad?.programs_lookup;
      const teacherCourseLoad = Array.isArray(programLoad?.teacher_course_loads)
        ? programLoad?.teacher_course_loads[0]
        : programLoad?.teacher_course_loads;
      const progAbbr =
        program?.abbr ||
        program?.name ||
        "";
      const yearStr = block.year ? `${block.year}` : "";
      const fullName = [progAbbr, yearStr + block.name]
        .filter(Boolean)
        .join(" ");

      return {
        id: block.id,
        name: fullName,
        programLoadId: block.program_load_id || "",
        courseId: teacherCourseLoad?.course_id || "",
      };
    });
  } catch (err) {
    console.error("Unexpected error loading sections:", err);
    return [];
  }
};

// Load rubrics for dropdown, separated by platform and teacher rubrics
export const fetchRubrics = async (): Promise<{
  platform: { id: string; name: string; description?: string; grading_intensity?: string }[];
  teacher: { id: string; name: string; description?: string; grading_intensity?: string }[];
}> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      return { platform: [], teacher: [] };
    }

    // First, ensure all platform rubrics are synced to database
    await initializePlatformRubrics();

    // Fetch rubrics with owner role from database
    const { data: allRubricsData, error: allRubricsError } = await supabase
      .from("rubrics")
      .select("id, name, description, grading_intensity, user_id, owner:users!user_id(role)")
      .order("name", { ascending: true });

    // Filter platform rubrics (user_id is null OR owner role is admin) in JavaScript
    const platformData =
      allRubricsData?.filter((r: any) => r.user_id === null || r.owner?.role === "admin") || [];
    const platformError = allRubricsError;

    // Fetch teacher rubrics from database
    const { data: teacherData, error: teacherError } = await supabase
      .from("rubrics")
      .select("id, name, description, grading_intensity")
      .eq("user_id", teacherId)
      .order("name", { ascending: true });

    if (platformError) {
      console.error("Error loading platform rubrics:", platformError);
    }
    if (teacherError) {
      console.error("Error loading teacher rubrics:", teacherError);
    }

    // If no platform rubrics in database, initialize them from templates
    let platformRubricsList: { id: string; name: string; description?: string; grading_intensity?: string }[] = [];
    if (!platformData || platformData.length === 0) {
      // Initialize all platform rubrics to database
      console.log("No platform rubrics found in database, initializing...");
      await initializePlatformRubrics();

      // Fetch again after initialization
      const { data: refreshedAllRubrics } = await supabase
        .from("rubrics")
        .select("id, name, description, grading_intensity, user_id, owner:users!user_id(role)")
        .order("name", { ascending: true });

      const refreshedPlatform = (refreshedAllRubrics || []).filter(
        (r: any) => r.user_id === null || r.owner?.role === "admin",
      );

      if (refreshedPlatform.length > 0) {
        // Use platform rubrics from database
        platformRubricsList = refreshedPlatform.map((r) => ({
          id: String(r.id),
          name: r.name,
          description: r.description,
          grading_intensity: r.grading_intensity,
        }));
      } else {
        // Fallback to hardcoded templates if initialization failed
        try {
          const { platformRubrics } = await import("../data/rubricData");
          platformRubricsList = (platformRubrics || []).map((r) => ({
            id: `platform-${r.id}`, // Prefix to distinguish from database IDs
            name: r.name,
            description: r.description,
            grading_intensity: r.type,
          }));
        } catch (importError) {
          console.error("Error importing platform rubrics:", importError);
        }
      }
    } else {
      // Use platform rubrics from database
      platformRubricsList = (platformData || []).map((r) => ({
        id: String(r.id),
        name: r.name,
        description: r.description,
        grading_intensity: r.grading_intensity,
      }));
    }

    return {
      platform: platformRubricsList.sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      teacher: (teacherData || []).map((r) => ({
        id: String(r.id),
        name: r.name,
        description: r.description,
        grading_intensity: r.grading_intensity,
      })),
    };
  } catch (err) {
    console.error("Unexpected error loading rubrics:", err);
    return { platform: [], teacher: [] };
  }
};

// Fetch students for a specific section, with their submission status for an activity
export const fetchStudentsByCourseAndSection = async (
  sectionId: string,
  activityId?: string,
): Promise<
  {
    id: string;
    name: string;
    status: "submitted" | "not submitted";
    score?: number;
    wordCount?: number;
    gradingError?: string;
    filePath?: string;
  }[]
> => {
  try {
    // Fetch students for this block (blocks replaced sections)
    // Query through block_students junction table
    const { data: blockStudentsData, error: blockStudentsError } =
      await supabase
        .from("block_students")
        .select(
          "student_id, users!student_id!inner(id, student_code, first_name, middle_name, last_name)",
        )
        .eq("block_id", sectionId);

    if (blockStudentsError) {
      console.error(
        `[fetchStudentsByCourseAndSection] Error loading students:`,
        blockStudentsError,
      );
      return [];
    }

    if (!blockStudentsData || blockStudentsData.length === 0) {
      return [];
    }

    // Extract students from junction table results
    type BlockStudentRow = {
      student_id: string;  // uuid
      users: {
        id: string;  // uuid
        student_code: string;
        first_name: string;
        middle_name: string | null;
        last_name: string;
      };
    };
    const studentsData = (
      blockStudentsData as unknown as BlockStudentRow[]
    ).map((bs) => bs.users);

    // Sort by full name in memory
    studentsData.sort((a, b) => {
      const nameA = buildFullNameFromObject(a, a.student_code).toLowerCase();
      const nameB = buildFullNameFromObject(b, b.student_code).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // If activityId is provided, fetch essay submissions for this activity
    const essaySubmissions = new Map<
      string,  // uuid
      {
        grammar?: number;
        score?: number;
        wordCount?: number;
        gradingError?: string;
        coherence?: number;
        readability?: number;
        argumentative?: number;
        filePath?: string;
      }
    >();

    if (activityId) {
      const activityDbId = resolveActivityIdForEssayFilter(activityId);
      if (activityDbId) {
        const studentIds = studentsData.map((s) => s.id);
        const { data: essaysData, error: essaysError } = await supabase
          .from("essays")
          .select(
            "student_id, coherence_score, readability_score, argument_strength_score, grammar_score, overall_score, word_count, grading_error, file_path",
          )
          .eq("activity_id", activityDbId)
          .in("student_id", studentIds);

        if (essaysError) {
          console.error("Error loading essay submissions:", essaysError);
        } else if (essaysData) {
          essaysData.forEach((essay) => {
            essaySubmissions.set(essay.student_id, {
              coherence: essay.coherence_score
                ? Number(essay.coherence_score)
                : undefined,
              readability: essay.readability_score
                ? Number(essay.readability_score)
                : undefined,
              argumentative: essay.argument_strength_score
                ? Number(essay.argument_strength_score)
                : undefined,
              grammar: essay.grammar_score
                ? Number(essay.grammar_score)
                : undefined,
              score: essay.overall_score
                ? Number(essay.overall_score)
                : undefined,
              wordCount: essay.word_count || undefined,
              gradingError: essay.grading_error || undefined,
              filePath: essay.file_path || undefined,
            });
          });
        }
      }
    }

    // Map students to the expected format
    const mappedStudents = studentsData.map((student) => {
      const submission = essaySubmissions.get(student.id);
      const hasSubmission = !!submission;

      return {
        id: String(student.id),
        name: buildFullNameFromObject(student, student.student_code),
        status: (hasSubmission ? "submitted" : "not submitted") as
          | "submitted"
          | "not submitted",
        coherence: submission?.coherence,
        readability: submission?.readability,
        argumentative: submission?.argumentative,
        grammar: submission?.grammar,
        score: submission?.score,
        wordCount: submission?.wordCount,
        gradingError: submission?.gradingError,
        filePath: submission?.filePath,
      };
    });

    return mappedStudents;
  } catch (err) {
    console.error(
      `[fetchStudentsByCourseAndSection] Unexpected error loading students:`,
      err,
    );
    return [];
  }
};

// Upload essay file and create essay submission record
export const uploadEssayFile = async (
  file: File,
  studentId: string,
  activityId: string,
  courseId: string,
  sectionId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher ID not available" };
    }

    // Verify course exists
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .single();

    if (courseError || !courseData) {
      return { success: false, error: "Course not found" };
    }

    // Verify teacher course load exists (which serves as the "section" assignment)
    const { data: loadData, error: loadError } = await supabase
      .from("teacher_course_loads")
      .select("id")
      .eq("id", sectionId)
      .single();

    if (loadError || !loadData) {
      return { success: false, error: "Course load (section) not found" };
    }

    // Generate unique file path
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;
    const filePath = `essays/${activityId}/${fileName}`;

    // Upload file to Supabase storage
    // Note: You'll need to create a 'essays' bucket in Supabase Storage first
    const { error: uploadError } = await supabase.storage
      .from("essays")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return {
        success: false,
        error: `File upload failed: ${uploadError.message}`,
      };
    }

    // Parse student ID (it might be a UUID or student_code)
    let studentDbId = studentId;
    
    if (!isUuidString(studentId)) {
      // If studentId is a student_code, fetch the actual DB ID
      const { data: studentData } = await supabase
        .from("users")
        .select("id")
        .eq("student_code", studentId)
        .eq("role", "student")
        .maybeSingle();

      if (!studentData) {
        return { success: false, error: "Student not found with code: " + studentId };
      }
      studentDbId = studentData.id;
    }

    // Parse activity ID
    const activityDbId = activityId;
    if (!activityDbId) {
      return { success: false, error: "Invalid activity ID" };
    }

    // Create essay record in database
    const { error: insertError } = await supabase.from("essays").insert({
      student_id: studentDbId,
      block_id: sectionId,
      activity_id: activityDbId,
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
      file_path: filePath,
      status: "submitted",
    });

    if (insertError) {
      console.error("Error creating essay record:", insertError);
      // Try to delete the uploaded file if DB insert fails
      await supabase.storage.from("essays").remove([filePath]);
      return {
        success: false,
        error: `Failed to create essay record: ${insertError.message}`,
      };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error uploading essay:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
};

// Update essay file (replace existing submission)
export const updateEssayFile = async (
  file: File,
  studentId: string,
  activityId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher ID not available" };
    }

    // Verify session context (not used anymore, but we keep the params)

    let studentDbId = studentId;
    if (!isUuidString(studentId)) {
      const { data: studentData } = await supabase
        .from("users")
        .select("id")
        .eq("student_code", studentId)
        .eq("role", "student")
        .maybeSingle();

      if (!studentData) {
        return { success: false, error: "Student not found with code: " + studentId };
      }
      studentDbId = studentData.id;
    }

    // Parse activity ID
    const activityDbId = activityId;
    if (!activityDbId) {
      return { success: false, error: "Invalid activity ID" };
    }

    // Find existing essay submission
    const { data: existingEssay, error: findError } = await supabase
      .from("essays")
      .select("id, file_path")
      .eq("student_id", studentDbId)
      .eq("activity_id", activityDbId)
      .single();

    if (findError || !existingEssay) {
      return { success: false, error: "Essay submission not found" };
    }

    // Delete old file from storage if it exists
    if (existingEssay.file_path) {
      await supabase.storage.from("essays").remove([existingEssay.file_path]);
    }

    // Generate new unique file path
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;
    const filePath = `essays/${activityId}/${fileName}`;

    // Upload new file to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("essays")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return {
        success: false,
        error: `File upload failed: ${uploadError.message}`,
      };
    }

    // Update essay record in database
    const { error: updateError } = await supabase
      .from("essays")
      .update({
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        file_path: filePath,
        submitted_at: new Date().toISOString(),
        // Reset analysis scores when updating
        grammar_score: null,
        readability_score: null,
        coherence_score: null,
        argument_strength_score: null,
        overall_score: null,
        grammar_errors: null,
        style_issues: null,
        argument_analysis: null,
        analysis_payload: null,
        status: "submitted",
      })
      .eq("id", existingEssay.id);

    if (updateError) {
      console.error("Error updating essay record:", updateError);
      // Try to delete the uploaded file if DB update fails
      await supabase.storage.from("essays").remove([filePath]);
      return {
        success: false,
        error: `Failed to update essay record: ${updateError.message}`,
      };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error updating essay:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
};

// Delete essay submission
export const deleteEssay = async (
  studentId: string,
  activityId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    let studentDbId = studentId;
    if (!isUuidString(studentId)) {
      const { data: studentData } = await supabase
        .from("users")
        .select("id")
        .eq("student_code", studentId)
        .eq("role", "student")
        .maybeSingle();

      if (!studentData) {
        return { success: false, error: "Student not found with code: " + studentId };
      }
      studentDbId = studentData.id;
    }

    // Parse activity ID
    const activityDbId = activityId;
    if (!activityDbId) {
      return { success: false, error: "Invalid activity ID" };
    }

    // Find existing essay submission
    const { data: existingEssay, error: findError } = await supabase
      .from("essays")
      .select("id, file_path")
      .eq("student_id", studentDbId)
      .eq("activity_id", activityDbId)
      .single();

    if (findError || !existingEssay) {
      return { success: false, error: "Essay submission not found" };
    }

    // Delete file from storage if it exists
    if (existingEssay.file_path) {
      const { error: deleteFileError } = await supabase.storage
        .from("essays")
        .remove([existingEssay.file_path]);

      if (deleteFileError) {
        console.error("Error deleting file from storage:", deleteFileError);
        // Continue with DB deletion even if file deletion fails
      }
    }

    // Delete essay record from database
    const { error: deleteError } = await supabase
      .from("essays")
      .delete()
      .eq("id", existingEssay.id);

    if (deleteError) {
      console.error("Error deleting essay record:", deleteError);
      return {
        success: false,
        error: `Failed to delete essay record: ${deleteError.message}`,
      };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error deleting essay:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
};

// Fetch student count and submission count for a course-section-activity combination
export const fetchCourseSectionCounts = async (
  _courseId: string,
  sectionId: string,
  activityId: string,
): Promise<{ studentCount: number; submissionCount: number }> => {
  try {
    // 1. Get all student IDs for this block
    const { data: bStudents, error: sErr } = await supabase
      .from("block_students")
      .select("student_id")
      .eq("block_id", sectionId);

    if (sErr) throw sErr;
    const studentIds = bStudents?.map(bs => bs.student_id) || [];
    const studentCount = studentIds.length;

    // 2. Count submissions for this activity by these students
    let submissionCount = 0;
    if (studentIds.length > 0) {
      const { count, error: countErr } = await supabase
        .from("essays")
        .select("*", { count: "exact", head: true })
        .eq("activity_id", activityId)
        .in("student_id", studentIds);

      if (countErr) {
        console.error("Error counting submissions:", countErr);
      } else {
        submissionCount = count || 0;
      }
    }

    return {
      studentCount,
      submissionCount,
    };
  } catch (err) {
    console.error("Unexpected error fetching counts:", err);
    return { studentCount: 0, submissionCount: 0 };
  }
};

// Fetch essay submission for a specific student and activity
export const fetchEssayByStudentAndActivity = async (
  studentId: string,
  activityId: string,
): Promise<{
  fileUrl: string;
  title: string;
  fileType: string;
  content?: string;
} | null> => {
  try {
    // Parse student ID
    let studentDbId = studentId;
    if (!isUuidString(studentId)) {
      const { data: studentData, error: studentError } = await supabase
        .from("users")
        .select("id")
        .eq("student_code", studentId)
        .eq("role", "student")
        .maybeSingle();

      if (studentError || !studentData) {
        console.error("Error finding student:", studentError || "No student found with code: " + studentId);
        return null;
      }
      studentDbId = studentData.id;
    }

    // Parse activity ID
    const activityDbId = activityId;
    if (!activityDbId) {
      console.error("Invalid activity ID");
      return null;
    }

    // Fetch essay record
    const { data: essayData, error: essayError } = await supabase
      .from("essays")
      .select("file_path, title, content")
      .eq("student_id", studentDbId)
      .eq("activity_id", activityDbId)
      .single();

    if (essayError || !essayData) {
      console.error("Error fetching essay:", essayError);
      return null;
    }

    // Treat it as a file upload if file_path is present, otherwise just text.
    let fileUrl = "";
    let fileType = "text";
    
    if (essayData.file_path) {
      const { data: urlData, error: urlError } = await supabase.storage
        .from("essays")
        .createSignedUrl(essayData.file_path, 3600);
      
      if (urlError) {
        console.error("Error creating signed URL:", urlError);
      } else if (urlData) {
        fileUrl = urlData.signedUrl;
        const ext = essayData.file_path.split(".").pop()?.toLowerCase();
        fileType = (ext === "pdf") ? "pdf" : (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) ? "image" : "file";
      }
    }

    return {
      fileUrl,
      title: essayData.title || "Essay Submission",
      fileType,
      content: essayData.content || undefined,
    };
  } catch (err) {
    console.error("Unexpected error fetching essay:", err);
    return null;
  }
};

// Check if essay has been graded (has analysis results)
export const checkEssayGraded = async (
  studentId: string,
  activityId: string,
): Promise<boolean> => {
  try {
    // Parse student ID
    let studentDbId = studentId;
    if (!isUuidString(studentId)) {
      const { data: studentData, error: studentError } = await supabase
        .from("users")
        .select("id")
        .eq("student_code", studentId)
        .eq("role", "student")
        .maybeSingle();

      if (studentError || !studentData) {
        return false;
      }
      studentDbId = studentData.id;
    }

    // Activity ID is now a UUID string
    const activityDbId = activityId;
    if (!activityDbId) {
      return false;
    }

    // First, get the essay ID
    const { data: essayData, error: essayError } = await supabase
      .from("essays")
      .select("id")
      .eq("student_id", studentDbId)
      .eq("activity_id", activityDbId)
      .single();

    if (essayError || !essayData) {
      return false;
    }

    // Check if analysis results exist in essay_analysis_results table
    // If table doesn't exist yet (406 error), fall back to checking essays.analysis_payload
    try {
      const { data: analysisData, error: analysisError } = await supabase
        .from("essay_analysis_results")
        .select("id")
        .eq("essay_id", essayData.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid error if not found

      // If we got data, essay is graded
      if (analysisData && !analysisError) {
        return true;
      }

      // If error indicates table doesn't exist, fall through to fallback silently
      if (analysisError) {
        const errorCode = analysisError.code || "";
        const errorMessage = String(analysisError.message || "");
        // Check for various indicators that table doesn't exist
        // 406 errors appear in the message, not as a status property
        if (
          errorCode === "PGRST116" ||
          errorMessage.includes("406") ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("relation") ||
          errorCode === "42P01" // PostgreSQL table doesn't exist
        ) {
          // Table doesn't exist - silently fall through to check essays.analysis_payload
          // This is expected if migration hasn't been run
        }
        // For other errors, also fall through to fallback
      }
    } catch {
      // Table might not exist yet - fall through to check essays.analysis_payload
      // Don't log - this is expected if migration hasn't been run
    }

    // Fallback: check essays.analysis_payload for backwards compatibility
    const { data: fallbackEssay, error: fallbackError } = await supabase
      .from("essays")
      .select("analysis_payload")
      .eq("id", essayData.id)
      .single();

    if (fallbackError || !fallbackEssay) {
      return false;
    }

    return !!fallbackEssay.analysis_payload;
  } catch (err) {
    console.error("Error checking if essay is graded:", err);
    return false;
  }
};

// Allow student to resubmit an activity by sending a notification and removing existing submission
export const allowResubmission = async (
  studentId: string,
  activityId: string,
  activityTitle: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Get student's auth_user_id and DB ID
    let studentDbId: string | null = isUuidString(studentId) ? studentId : null;
    let authUserId: string | null = null;

    if (!studentDbId) {
      const { data: studentData } = await supabase
        .from("users")
        .select("id")
        .eq("student_code", studentId)
        .eq("role", "student")
        .maybeSingle();
      studentDbId = studentData?.id || null;
      authUserId = studentDbId; // Now same as ID
    } else {
      const { data: studentData } = await supabase
        .from("users")
        .select("id")
        .eq("id", studentDbId)
        .eq("role", "student")
        .maybeSingle();
      authUserId = studentData?.id || null;
    }

    if (!authUserId || !studentDbId) {
      return { success: false, error: "Student record not found" };
    }

    // 2. Remove existing submission if it exists
    // We do this first so the student can immediately see the upload prompt
    const { data: existingEssay } = await supabase
      .from("essays")
      .select("id, file_path")
      .eq("student_id", studentDbId)
      .eq("activity_id", activityId)
      .maybeSingle();

    if (existingEssay) {
      // Delete file from storage
      if (existingEssay.file_path) {
        await supabase.storage.from("essays").remove([existingEssay.file_path]);
      }

      // Delete database record (cascades to analysis results)
      await supabase.from("essays").delete().eq("id", existingEssay.id);
      console.log(
        `Deleted existing essay ${existingEssay.id} for resubmission.`,
      );
    }

    // 3. Create notification
    const { error: notifyError } = await supabase.from("notifications").insert({
      user_id: authUserId,
      type: "resubmission_allowed",
      title: "Resubmission Allowed",
      message: `Your teacher has allowed you to resubmit or reupload your work for: "${activityTitle}".`,
      related_id: String(activityId),
      related_type: "essay_activities",
    });

    if (notifyError) {
      console.error("Notification error:", notifyError);
      return {
        success: true,
        error: "Submission removed, but notification failed to send.",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("Error allowing resubmission:", err);
    return {
      success: false,
      error: "Unexpected error during resubmission setup.",
    };
  }
};

// Grade essay: OCR -> Analysis -> Save to Supabase -> Create notification
export const gradeEssay = async (
  studentId: string,
  studentName: string,
  activityId: string,
  onProgress?: (progress: number, step: string) => void,
): Promise<{ success: boolean; error?: string }> => {
  try {
    onProgress?.(5, "Preparing...");

    // Parse student ID
    let studentDbId = studentId;
    let authUserId: string | null = null;

    if (!isUuidString(studentId)) {
      const { data: studentData, error: studentError } = await supabase
        .from("users")
        .select("id")
        .eq("student_code", studentId)
        .eq("role", "student")
        .maybeSingle();

      if (studentError || !studentData) {
        return { success: false, error: "Student not found" };
      }
      studentDbId = studentData.id;
      authUserId = studentData.id;
    } else {
      const { data: stdData } = await supabase
        .from("users")
        .select("id")
        .eq("id", studentDbId)
        .eq("role", "student")
        .maybeSingle();

      if (stdData) {
        authUserId = stdData.id;
      }
    }

    // Activity ID is now a UUID string
    const activityDbId = activityId;
    if (!activityDbId) {
      return { success: false, error: "Invalid activity ID" };
    }

    const { data: essayData, error: essayError } = await supabase
      .from("essays")
      .select(
        "id, file_path, content, title, essay_activities(id, title, min_word_count)",
      )
      .eq("student_id", studentDbId)
      .eq("activity_id", activityDbId)
      .single();

    if (essayError || !essayData) {
      console.error("Error fetching essay:", essayError);
      return {
        success: false,
        error:
          essayError?.message ||
          "Essay not found. Please ensure the essay has been submitted.",
      };
    }

    let extractedText: string = "";
    let wordCount: number = 0;

    if (essayData.content && essayData.content.trim()) {
      onProgress?.(20, "Using text content from editor...");
      extractedText = essayData.content;
      wordCount = extractedText
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
    } else if (essayData.file_path) {
      // Get signed URL to download file
      const { data: urlData, error: urlError } = await supabase.storage
        .from("essays")
        .createSignedUrl(essayData.file_path, 3600);

      if (urlError || !urlData?.signedUrl) {
        return { success: false, error: "Failed to get file URL" };
      }

      onProgress?.(10, "Downloading PDF...");

      // Download file
      const response = await fetch(urlData.signedUrl);
      if (!response.ok) {
        return { success: false, error: "Failed to download file" };
      }
      const blob = await response.blob();
      const file = new File(
        [blob],
        essayData.file_path.split("/").pop() || "essay.pdf",
        {
          type: blob.type,
        },
      );

      onProgress?.(20, "Extracting text from PDF (OCR)...");

      // Step 1: OCR - Extract text from PDF
      const { ocrApi } = await import("../api");
      try {
        const ocrResult = await ocrApi.extractTextFromFile(file);
        extractedText = ocrResult.text;
        wordCount = extractedText
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 0).length;
      } catch (ocrErr) {
        console.error("OCR error:", ocrErr);
        return {
          success: false,
          error: "Failed to extract text from PDF (OCR failed)",
        };
      }
    } else {
      return { success: false, error: "No essay content or file found" };
    }

    const essayActivities =
      essayData.essay_activities as
        | { min_word_count?: number | null; title?: string | null }
        | Array<{ min_word_count?: number | null; title?: string | null }>
        | null
        | undefined;
    const minWordCount =
      (Array.isArray(essayActivities)
        ? essayActivities[0]?.min_word_count
        : essayActivities?.min_word_count) || 150;

    // Update essay with word count immediately
    await supabase
      .from("essays")
      .update({
        word_count: wordCount,
        grading_error:
          wordCount < minWordCount
            ? `Essay will not be graded because it did not reach the minimum word count of ${minWordCount} words.`
            : null,
      })
      .eq("id", essayData.id);

    if (!extractedText || extractedText.trim().length < 10) {
      return {
        success: false,
        error:
          "Failed to extract text from PDF. The file may be corrupted or unreadable.",
      };
    }

    if (wordCount < minWordCount) {
      return {
        success: false,
        error: `Essay is too short (${wordCount} words). Minimum required is ${minWordCount} words.`,
      };
    }

    onProgress?.(45, "Analyzing essay...");

    // Step 2: Analyze text (automatic - proceeds immediately after OCR)
    const { analysisApi } = await import("../api");
    let analysisResult;
    try {
      // Get rubric_id from activity if available
      const { data: activityData } = await supabase
        .from("essay_activities")
        .select("rubric_id")
        .eq("id", activityDbId)
        .single();

      let rubricId: string | undefined = undefined;

      if (activityData?.rubric_id) {
        // Use the database ID directly (same as AnalyzeEssay.tsx does)
        // The backend will query the database to fetch the rubric
        rubricId = String(activityData.rubric_id);

        // Verify rubric exists in database (for logging/debugging)
        const { data: rubricData, error: rubricError } = await supabase
          .from("rubrics")
          .select("id, name, created_by")
          .eq("id", activityData.rubric_id)
          .single();

        if (rubricError || !rubricData) {
          console.warn(
            `[gradeEssay] Rubric ${activityData.rubric_id} not found in Supabase database. Backend may not find it either.`,
            rubricError,
          );
        } else {
          console.log(
            `[gradeEssay] Rubric found: ID=${rubricData.id}, Name="${
              rubricData.name
            }", Platform=${rubricData.created_by === null}`,
          );
        }
      }

      console.log(
        "[gradeEssay] Activity rubric_id:",
        activityData?.rubric_id,
        "Passing to analysis:",
        rubricId,
      );

      analysisResult = await analysisApi.analyzeText(
        extractedText,
        essayData.title || "Essay",
        "comprehensive",
        rubricId,
      );

      console.log(
        "[gradeEssay] Analysis result includes rubric_scores:",
        !!analysisResult.rubric_scores,
      );
      if (rubricId && !analysisResult.rubric_scores) {
        console.error(
          "[gradeEssay] ERROR: Rubric ID was provided but rubric_scores not in response.",
          "This means the backend could not find or apply the rubric.",
          "Rubric ID:",
          rubricId,
          "Check backend logs for details.",
        );
        // Try to fetch the rubric again to verify it exists
        const { data: verifyRubric } = await supabase
          .from("rubrics")
          .select("id, name, created_by")
          .eq("id", rubricId)
          .single();

        if (verifyRubric) {
          console.log(
            "[gradeEssay] Rubric exists in Supabase:",
            verifyRubric,
            "Backend should be able to find it. Check backend database connection.",
          );
        } else {
          console.error(
            "[gradeEssay] Rubric does not exist in Supabase! This is the problem.",
          );
        }
      }
    } catch (analysisErr) {
      console.error("Analysis error:", analysisErr);
      return {
        success: false,
        error:
          analysisErr instanceof Error
            ? analysisErr.message
            : "Failed to analyze essay",
      };
    }

    onProgress?.(85, "Saving results to database...");

    // Step 3: Save analysis results to Supabase
    // First, update the essay record with basic scores
      const { error: updateError } = await supabase
        .from("essays")
        .update({
          content: extractedText, // Save the OCR/Extracted text back to the essay content column for easy retrieval
          grammar_score: analysisResult.scores?.grammar || null,
          readability_score: analysisResult.scores?.readability || null,
          coherence_score: analysisResult.scores?.coherence || null,
          argument_strength_score:
            analysisResult.scores?.argument_strength || null,
          overall_score: analysisResult.scores?.overall || null,
          grammar_errors:
            analysisResult.detailed_analysis?.grammar?.errors || null,
          style_issues:
            analysisResult.detailed_analysis?.readability?.issues || null,
          argument_analysis: {
            argumentation: analysisResult.detailed_analysis?.argumentation,
            knowledge_graph: analysisResult.detailed_analysis?.knowledge_graph,
            coherence: analysisResult.detailed_analysis?.coherence,
          },
          status: "analyzed",
        })
        .eq("id", essayData.id);

    if (updateError) {
      console.error("Error updating essay:", updateError);
      return {
        success: false,
        error: `Failed to update essay: ${updateError.message}`,
      };
    }

    // Get teacher ID
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher ID not available" };
    }

    // Save complete analysis results to essay_analysis_results table
    // This includes ALL data needed for the interactive AnalysisResults view:
    // - Grammar errors with offset, errorLength, context for hover/highlighting
    // - Readability metrics (Flesch Ease, Grade Level, etc.)
    // - Argument structure (claims, evidence, warrants, rebuttals)
    // - Knowledge graph visualization data
    // - Coherence analysis with topic sentences, transitions, etc.
    // - Original essay text for display with highlights

    // Try to save to essay_analysis_results table (if it exists)
    // If table doesn't exist, we'll still save to essays table as fallback
    let analysisResultData;
    try {
      analysisResultData = {
        essay_id: essayData.id,
        student_id: studentDbId,
        activity_id: activityDbId,
        analysis_type: analysisResult.analysis_type || "comprehensive",
        word_count: analysisResult.word_count || null,
        generated_at: analysisResult.generated_at || new Date().toISOString(),
        processing_time_seconds: analysisResult.processing_time_seconds || null,
        grammar_score: analysisResult.scores?.grammar || null,
        readability_score: analysisResult.scores?.readability || null,
        coherence_score: analysisResult.scores?.coherence || null,
        argument_strength_score:
          analysisResult.scores?.argument_strength || null,
        knowledge_graph_score: analysisResult.scores?.knowledge_graph || null,
        overall_score: analysisResult.scores?.overall || null,
        // Save complete detailed_analysis with ALL interactive data:
        // - detailed_analysis.grammar.errors[] with offset, errorLength, context, message, suggestion
        // - detailed_analysis.readability with flesch_reading_ease, flesch_kincaid_grade, issues[]
        // - detailed_analysis.argumentation with claims, evidence, warrants, rebuttals, graph
        // - detailed_analysis.knowledge_graph with concepts, relationships, graph_structure
        // - detailed_analysis.coherence with topic_sentences, transitional_elements, coherence_issues
        detailed_analysis: analysisResult.detailed_analysis || {},
        // Save recommendations with priority, dimension, message, suggestion, action_items
        recommendations: analysisResult.recommendations || [],
        // Save diagnostic summary with strengths, weaknesses, critical_issues
        diagnostic_summary: analysisResult.diagnostic_summary || null,
        // Save rubric scores if rubric was applied
        rubric_scores: analysisResult.rubric_scores || null,
        // Save original essay text - CRITICAL for displaying with grammar error highlights
        original_text: extractedText,
      };

      // Verify critical data is present before saving
      if (
        !analysisResultData.detailed_analysis ||
        Object.keys(analysisResultData.detailed_analysis).length === 0
      ) {
        console.warn("Warning: detailed_analysis is empty or missing");
      }
      if (
        !analysisResultData.original_text ||
        analysisResultData.original_text.trim().length === 0
      ) {
        console.warn("Warning: original_text is empty or missing");
      }
      // Verify grammar errors have offset/errorLength for highlighting
      const grammarErrors =
        analysisResultData.detailed_analysis?.grammar?.errors || [];
      const errorsWithOffsets = grammarErrors.filter(
        (e: import("../types/Essay").GrammarError) =>
          typeof e.offset === "number" && typeof e.errorLength === "number",
      );
      if (
        grammarErrors.length > 0 &&
        errorsWithOffsets.length < grammarErrors.length
      ) {
        console.warn(
          `Warning: ${
            grammarErrors.length - errorsWithOffsets.length
          } grammar errors missing offset/errorLength for highlighting`,
        );
      }

      // Use upsert to handle both insert and update cases
      const { error: analysisResultError } = await supabase
        .from("essay_analysis_results")
        .upsert(analysisResultData, {
          onConflict: "essay_id",
        });

      if (analysisResultError) {
        // If table doesn't exist (406) or other error, log but continue
        // We'll still have saved to essays table above
        if (
          analysisResultError.code === "PGRST116" ||
          analysisResultError.message?.includes("406")
        ) {
          console.warn(
            "essay_analysis_results table not found. Please run the migration: supabase/create_essay_analysis_results_table.sql",
          );
          console.warn("Analysis results saved to essays table as fallback.");
        } else {
          console.error("Error saving analysis results:", analysisResultError);
          // Don't fail the whole operation - results are still in essays table
        }
      }
    } catch (tableError) {
      // Table might not exist - that's okay, we saved to essays table
      console.warn(
        "Could not save to essay_analysis_results table:",
        tableError,
      );
      console.warn(
        "Analysis results saved to essays table. Please run migration to enable full features.",
      );
    }

    onProgress?.(95, "Finalizing...");

    // Step 4: Create notifications
    const teacherUUID = await fetchTeacherUUID();
    if (teacherUUID) {
      const activityTitle = Array.isArray(essayActivities)
        ? essayActivities[0]?.title || "Essay"
        : essayActivities?.title || "Essay";

      // 4a. Create notification for teacher (using teacher's UUID)
      await supabase.from("notifications").insert({
        user_id: teacherUUID,
        type: "essay_graded",
        title: "Essay Graded",
        message: `${studentName}'s essay for "${activityTitle}" has been graded successfully.`,
        read: false,
        related_id: JSON.stringify({
          essayId: String(essayData.id),
          studentId: String(studentDbId),
          activityId: String(activityDbId),
          studentName: studentName,
        }),
        related_type: "essay",
      });

      // 4b. Create notification for student (using student's UUID)
      const studentUUID = authUserId;
      if (studentUUID) {
        await supabase.from("notifications").insert({
          user_id: studentUUID,
          type: "essay_graded",
          title: "Grade Available",
          message: `Your essay for "${activityTitle}" has been graded. You can now view your results and feedback.`,
          read: false,
          related_id: JSON.stringify({
            essayId: String(essayData.id),
            activityId: String(activityDbId),
          }),
          related_type: "essay",
        });
      }
    }

    onProgress?.(100, "Complete!");

    return { success: true };
  } catch (err) {
    console.error("Error grading essay:", err);
    return {
      success: false,
      error: getErrorMessage(err),
    };
  }
};

// Fetch analysis results for an essay
export const fetchEssayAnalysis = async (
  studentId: string,
  activityId: string,
): Promise<{
  analysis: Omit<import("../types/Essay").AnalysisResponse, "essay_id">;
  text: string;
  title: string;
  plagiarismResults?: import("../api").PlagiarismCheckResponse | null;
  aiDetectionResults?: import("../api").AIDetectionResponse | null;
  filePath?: string | null;
} | null> => {
  try {
    const studentDbId = await resolveStudentIdForEssayFilter(studentId);
    const activityDbId = resolveActivityIdForEssayFilter(activityId);
    if (studentDbId == null || activityDbId == null) {
      return null;
    }

    const { data: essayData, error: essayError } = await supabase
      .from("essays")
      .select("id, title, file_path")
      .eq("student_id", studentDbId)
      .eq("activity_id", activityDbId)
      .maybeSingle();

    if (essayError || !essayData) {
      return null;
    }

    // Fetch complete analysis results from essay_analysis_results table
    // If table doesn't exist, fall back to essays.analysis_payload
    let analysisData = null;
    let analysisError = null;

    try {
      const result = await supabase
        .from("essay_analysis_results")
        .select("*")
        .eq("essay_id", essayData.id)
        .maybeSingle();

      analysisData = result.data;
      analysisError = result.error;
    } catch {
      // Table might not exist - will fall back to essays.analysis_payload
      console.log(
        "essay_analysis_results table not accessible, using fallback",
      );
      analysisError = { code: "TABLE_NOT_FOUND" };
    }

    if (analysisError || !analysisData) {
      // Fallback: try to get from essays table directly (both analysis_payload and individual columns)
      const { data: fallbackEssay, error: fallbackError } = await supabase
        .from("essays")
        .select(`
          id, title, file_path, content,
          analysis_payload,
          overall_score, grammar_score, readability_score, coherence_score, argument_strength_score,
          grammar_errors, style_issues, argument_analysis,
          word_count, status
        `)
        .eq("id", essayData.id)
        .maybeSingle();

      if (fallbackError || !fallbackEssay) {
        return null;
      }

      // If we have a complete payload, use it
      if (fallbackEssay.analysis_payload) {
        let text = fallbackEssay.content || "";
        if (!text && fallbackEssay.file_path) {
          try {
            const { data: urlData } = await supabase.storage
              .from("essays")
              .createSignedUrl(fallbackEssay.file_path, 3600);

            if (urlData?.signedUrl) {
              const response = await fetch(urlData.signedUrl);
              if (response.ok) {
                const blob = await response.blob();
                const file = new File(
                  [blob],
                  fallbackEssay.file_path.split("/").pop() || "essay.pdf",
                );
                const { ocrApi } = await import("../api");
                const ocrResult = await ocrApi.extractTextFromFile(file);
                text = ocrResult.text;
              }
            }
          } catch (err) {
            console.error("Error extracting text for display:", err);
          }
        }
        return {
          analysis: fallbackEssay.analysis_payload,
          text: text,
          title: fallbackEssay.title || "Essay Analysis",
          filePath: fallbackEssay.file_path,
        };
      }

      // If no payload, but we have individual columns, reconstruct it
      if (fallbackEssay.overall_score !== null) {
        return {
          analysis: {
            analysis_type: "reconstructed",
            scores: {
              grammar: fallbackEssay.grammar_score || 0,
              readability: fallbackEssay.readability_score || 0,
              coherence: fallbackEssay.coherence_score || 0,
              argument_strength: fallbackEssay.argument_strength_score || 0,
              knowledge_graph: 0,
              overall: fallbackEssay.overall_score || 0,
            },
            detailed_analysis: {
              grammar: {
                score: fallbackEssay.grammar_score || 0,
                errors: fallbackEssay.grammar_errors || [],
                error_count: (fallbackEssay.grammar_errors || []).length,
                syntax_patterns: {
                  sentence_types: {
                    simple: 0,
                    compound: 0,
                    complex: 0,
                    compound_complex: 0,
                  },
                  dependency_tags: {},
                  pos_tags: {},
                  complexity_score: 0,
                  avg_dependency_depth: 0,
                },
              },
              readability: {
                score: fallbackEssay.readability_score || 0,
                flesch_reading_ease: 0,
                flesch_kincaid_grade: 0,
                smog_index: 0,
                coleman_liau_index: 0,
                lexical_diversity: 0,
                issues: fallbackEssay.style_issues || [],
              },
              coherence: {
                score: fallbackEssay.coherence_score || 0,
                entity_grid_score: 0,
                semantic_similarity_score: 0,
                transition_score: 0,
                paragraph_unity: 0,
                topic_sentences: [],
                transitional_elements: [],
                coherence_issues: [],
                structure_analysis: {
                  has_introduction: false,
                  has_body: false,
                  has_conclusion: false,
                  paragraph_count: 0,
                  sentence_count: 0,
                  structure_quality: "unknown",
                },
              },
              argumentation: {
                score: fallbackEssay.argument_strength_score || 0,
                claim_score: 0,
                evidence_score: 0,
                warrant_score: 0,
                rebuttal_score: 0,
                claims: [],
                grounds: [],
                warrants: [],
                rebuttals: [],
                argument_structure: {
                  total_claims: 0,
                  total_grounds: 0,
                  total_warrants: 0,
                  total_rebuttals: 0,
                  grounds_per_claim: 0,
                  has_thesis: false,
                  has_evidence: false,
                  has_reasoning: false,
                  has_counterarguments: false,
                },
                toulmin_analysis: {
                  has_claim: false,
                  has_ground: false,
                  has_warrant: false,
                  has_rebuttal: false,
                  completeness_score: 0,
                },
                argument_issues: [],
              },
              knowledge_graph: {
                score: 0,
                concepts: [],
                relationships: [],
                graph_structure: {
                  nodes: 0,
                  edges: 0,
                  density: 0,
                  clusters: 0,
                  avg_clustering: 0,
                  is_connected: false,
                },
                concept_coverage: {
                  coverage_score: 0,
                  concept_distribution: {},
                },
                conceptual_gaps: [],
                connectivity_score: 0,
                depth_score: 0,
              },
            },
            recommendations: [],
            diagnostic_summary: {
              overall_score: fallbackEssay.overall_score || 0,
              strengths: [],
              weaknesses: [],
              critical_issues: [],
              dimension_scores: {},
            },
            word_count: fallbackEssay.word_count || 0,
            generated_at: new Date().toISOString(),
          },
          text: fallbackEssay.content || "",
          title: fallbackEssay.title || "Essay Analysis",
          filePath: fallbackEssay.file_path,
        };
      }

      return null;
    }

    // Reconstruct the analysis response from the database record
    // This preserves ALL interactive data including:
    // - Grammar errors with offset/errorLength for hover/highlighting
    // - Readability metrics for display
    // - Argument structure for visualization
    // - Knowledge graph data for graph display
    // - Coherence analysis for feedback
    const analysis: Omit<
      import("../types/Essay").AnalysisResponse,
      "essay_id"
    > = {
      analysis_type: analysisData.analysis_type || "comprehensive",
      scores: {
        grammar: analysisData.grammar_score || 0,
        readability: analysisData.readability_score || 0,
        coherence: analysisData.coherence_score || 0,
        argument_strength: analysisData.argument_strength_score || 0,
        knowledge_graph: analysisData.knowledge_graph_score || 0,
        overall: analysisData.overall_score || 0,
      },
      detailed_analysis: analysisData.detailed_analysis || {},
      recommendations: analysisData.recommendations || [],
      diagnostic_summary: analysisData.diagnostic_summary || undefined,
      word_count: analysisData.word_count || undefined,
      generated_at: analysisData.generated_at || new Date().toISOString(),
    };

    const plagiarismResults = analysisData.plagiarism_results || null;
    const aiDetectionResults = analysisData.ai_detection_results || null;

    if (aiDetectionResults && !aiDetectionResults.is_ai_generated && aiDetectionResults.is_ai !== undefined) {
      aiDetectionResults.is_ai_generated = !!aiDetectionResults.is_ai;
    }

    // Add rubric_scores if present (for TextAnalysisResponse compatibility)
    if (analysisData.rubric_scores) {
      (
        analysis as import("../types/Essay").TextAnalysisResponse
      ).rubric_scores = analysisData.rubric_scores;
    } else {
      // If rubric_scores is missing but we have a rubric_id, try to fetch it from the activity
      if (analysisData.activity_id) {
        const { data: activity } = await supabase
          .from("essay_activities")
          .select("rubric_id, rubrics(id, name)")
          .eq("id", analysisData.activity_id)
          .single();

        if (activity?.rubrics) {
          // Rubric found but no scores in analysis - provide basic rubric info
          const rubricInfo = Array.isArray(activity.rubrics) ? activity.rubrics[0] : activity.rubrics;
          (analysis as any).rubric_scores = {
            rubric_id: rubricInfo.id,
            rubric_name: rubricInfo.name,
            rubric_applied: false, // Mark as not applied to show "Rubric Not Applied" with the name
            criteria_scores: []
          };
        }
      }
    }

    // Normalize legacy AI fields
    const normalizedAIDetection = aiDetectionResults ? { ...aiDetectionResults } : null;
    if (normalizedAIDetection) {
      if (normalizedAIDetection.is_ai_generated === undefined && (normalizedAIDetection as any).is_ai !== undefined) {
        normalizedAIDetection.is_ai_generated = !!(normalizedAIDetection as any).is_ai;
      }
      if (normalizedAIDetection.ai_score === undefined && (normalizedAIDetection as any).score !== undefined) {
        normalizedAIDetection.ai_score = (normalizedAIDetection as any).score;
      }
    }

    return {
      analysis: analysis,
      text: analysisData.original_text || "",
      title: essayData.title || "Essay Analysis",
      plagiarismResults,
      aiDetectionResults: normalizedAIDetection,
      filePath: essayData.file_path,
    };
  } catch (err) {
    console.error("Error fetching essay analysis:", err);
    return null;
  }
};

// Fetch all analysis results for a student (useful for notifications)
export const fetchStudentAnalysisResults = async (
  studentId: string,
): Promise<
  Array<{
    analysis: import("../types/Essay").TextAnalysisResponse;
    text: string;
    title: string;
    activityId: string;
    generatedAt: string;
  }>
> => {
  try {
    // Parse student ID
    let studentDbId = studentId;
    if (!isUuidString(studentId)) {
      const { data: studentData, error: studentError } = await supabase
        .from("users")
        .select("id")
        .eq("student_code", studentId)
        .eq("role", "student")
        .maybeSingle();

      if (studentError || !studentData) {
        return [];
      }
      studentDbId = studentData.id;
    }

    // Fetch all analysis results for this student
    const { data: analysisResults, error: analysisError } = await supabase
      .from("essay_analysis_results")
      .select(
        `
        *,
        essays!inner(id, title, activity_id)
      `,
      )
      .eq("student_id", studentDbId)
      .order("generated_at", { ascending: false });

    if (analysisError || !analysisResults) {
      return [];
    }

    // Map to the expected format
    return analysisResults.map(
      (result: {
        analysis_type: string;
        grammar_score: number | null;
        readability_score: number | null;
        coherence_score: number | null;
        argument_strength_score: number | null;
        knowledge_graph_score: number | null;
        overall_score: number | null;
        detailed_analysis: import("../types/Essay").DetailedAnalysis;
        recommendations: import("../types/Essay").DiagnosticRecommendation[];
        diagnostic_summary: import("../types/Essay").DiagnosticSummary | null;
        rubric_scores:
          | import("../types/Essay").TextAnalysisResponse["rubric_scores"]
          | null;
        word_count: number | null;
        generated_at: string;
        original_text: string | null;
        essays: {
          id: number;
          title: string;
          activity_id: number | null;
        } | null;
      }) => {
        const essay = result.essays;
        // Use TextAnalysisResponse type which has optional fields
        const analysis: import("../types/Essay").TextAnalysisResponse = {
          analysis_type: result.analysis_type || "comprehensive",
          scores: {
            grammar: result.grammar_score || 0,
            readability: result.readability_score || 0,
            coherence: result.coherence_score || 0,
            argument_strength: result.argument_strength_score || 0,
            knowledge_graph: result.knowledge_graph_score || 0,
            overall: result.overall_score || 0,
          },
          detailed_analysis: result.detailed_analysis || {},
          recommendations: result.recommendations || [],
          diagnostic_summary: result.diagnostic_summary || undefined,
          word_count: result.word_count || undefined,
          generated_at: result.generated_at || new Date().toISOString(),
          rubric_scores: result.rubric_scores || undefined,
        };

        return {
          analysis: analysis,
          text: result.original_text || "",
          title: essay?.title || "Essay Analysis",
          activityId: String(essay?.activity_id || ""),
          generatedAt: result.generated_at || new Date().toISOString(),
        };
      },
    );
  } catch (err) {
    console.error("Error fetching student analysis results:", err);
    return [];
  }
};

// Duplicate essay detection types
export interface DuplicateEssayGroup {
  contentHash: string; // Normalized content for grouping
  essays: Array<{
    essayId: string;
    studentId: string;
    studentName: string;
    programName: string;
    sectionName: string;
    title: string;
    submittedAt: string;
    activityId?: string; // Track which activity this submission belongs to
  }>;
}

// Normalize text for comparison (remove extra whitespace, lowercase, remove punctuation)
// Also attempts to strip common headers/names at the beginning
const normalizeText = (text: string): string => {
  let normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // Try to strip common header patterns at the beginning
  // Pattern: name + program/section info (e.g., "junie antopina bscs ds 4b")
  // Look for patterns like: word word word (program code) (section) followed by essay content
  // Common patterns: name + "bscs" or "bstm" or program codes + section numbers
  const headerPatterns = [
    /^[a-z]+\s+[a-z]+\s+(bscs|bstm|bsit|bsba|bsed|bsn|bsa|bs|ba|ma|phd)[\s\w]*?\s+/, // Name + program code
    /^[a-z]+\s+[a-z]+\s+[a-z]+\s+(bscs|bstm|bsit|bsba|bsed|bsn|bsa)[\s\w]*?\s+/, // Full name + program
    /^[a-z]+\s+[a-z]+\s+\d+[a-z]?\s+/, // Name + section (e.g., "john doe 1b")
  ];

  for (const pattern of headerPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      // Check if removing the header makes sense (essay should still be substantial)
      const withoutHeader = normalized.substring(match[0].length).trim();
      if (withoutHeader.length > normalized.length * 0.5) {
        // Header is less than 50% of text, safe to remove
        normalized = withoutHeader;
        break;
      }
    }
  }

  return normalized;
};

// Calculate text similarity using simple word-based comparison
// Returns a value between 0 and 1 (1 = identical, 0 = completely different)
const calculateTextSimilarity = (text1: string, text2: string): number => {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);

  // If texts are identical after normalization, return 1.0
  if (normalized1 === normalized2) {
    return 1.0;
  }

  // Split into words
  const words1 = normalized1.split(/\s+/).filter((w) => w.length > 0);
  const words2 = normalized2.split(/\s+/).filter((w) => w.length > 0);

  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }

  // Calculate Jaccard similarity (intersection over union)
  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  const jaccardSimilarity = intersection.size / union.size;

  // Also calculate word order similarity (simple approach)
  // Count how many words appear in the same relative position
  const minLength = Math.min(words1.length, words2.length);
  let positionMatches = 0;
  for (let i = 0; i < minLength; i++) {
    if (words1[i] === words2[i]) {
      positionMatches++;
    }
  }
  const orderSimilarity = minLength > 0 ? positionMatches / minLength : 0;

  // Combine Jaccard and order similarity (weighted average)
  return jaccardSimilarity * 0.7 + orderSimilarity * 0.3;
};

// Generate a simple hash for text comparison (for quick grouping)
const generateContentHash = (text: string): string => {
  const normalized = normalizeText(text);
  // Use word count + first 50 words for quick grouping
  const words = normalized.split(/\s+/).filter((w) => w.length > 0);
  const firstWords = words.slice(0, 50).join(" ");
  return `${words.length}-${firstWords.substring(0, 200)}`;
};

// Helper function to process similarity groups (defined before use)
const processSimilarityGroups = (
  groups: Map<string, DuplicateEssayGroup["essays"]>,
  sourceData: Array<{
    essay_id?: string;
    original_text?: string | null;
    content?: string | null;
    essays?: unknown;
    id?: string;
  }>,
  textField: "original_text" | "content",
): DuplicateEssayGroup[] => {
  // Get all texts
  const essayTexts = new Map<string, string>();
  for (const item of sourceData) {
    const text =
      textField === "original_text" ? item.original_text : item.content;
    let essayId: string | undefined;

    if (textField === "original_text") {
      // For original_text, extract essay ID from nested structure
      // Supabase returns essays as an object (not array) when using !inner
      const essaysData = item.essays as { id?: string } | undefined;
      essayId = essaysData?.id ? String(essaysData.id) : (item.essay_id ? String(item.essay_id) : undefined);
    } else {
      essayId = item.id ? String(item.id) : undefined;
    }

    if (text && essayId) {
      essayTexts.set(essayId, text);
    }
  }

  const duplicateGroups: DuplicateEssayGroup[] = [];
  // Lower threshold to catch essays with headers/formatting differences 
  // and minor word changes to act similarly to fuzzy searching
  const SIMILARITY_THRESHOLD = 0.45;

  // Collect all essays from all hash groups for cross-group comparison
  const allEssays: Array<{ essayId: string; hash: string }> = [];
  for (const [hash, essays] of groups.entries()) {
    for (const essay of essays) {
      allEssays.push({ essayId: essay.essayId, hash });
    }
  }

  // Group essays by similarity (compare across hash groups too)
  const similarityGroups: Array<DuplicateEssayGroup["essays"]> = [];
  const processedEssays = new Set<string>();
  
  console.log(`[processSimilarityGroups] Total essays to check: ${allEssays.length}`);

  for (let i = 0; i < allEssays.length; i++) {
    if (processedEssays.has(allEssays[i].essayId)) {
      continue;
    }

    const text1 = essayTexts.get(allEssays[i].essayId) || "";
    if (!text1) continue;

    // Find the essay info from groups
    let currentEssay: DuplicateEssayGroup["essays"][0] | null = null;
    for (const [, essays] of groups.entries()) {
      const found = essays.find((e) => e.essayId === allEssays[i].essayId);
      if (found) {
        currentEssay = found;
        break;
      }
    }

    if (!currentEssay) continue;

    const similarEssays: DuplicateEssayGroup["essays"] = [currentEssay];
    processedEssays.add(allEssays[i].essayId);

    // Compare with all other essays (including those in different hash groups)
    for (let j = i + 1; j < allEssays.length; j++) {
      if (processedEssays.has(allEssays[j].essayId)) {
        continue;
      }

      const text2 = essayTexts.get(allEssays[j].essayId) || "";
      if (!text2) continue;

      // Skip if texts are too different in length (likely not duplicates)
      const lengthDiff = Math.abs(text1.length - text2.length);
      const avgLength = (text1.length + text2.length) / 2;
      if (avgLength > 0 && lengthDiff / avgLength > 0.3) {
        // More than 30% length difference, likely not duplicates
        continue;
      }

      const similarity = calculateTextSimilarity(text1, text2);
      // console.log(`[processSimilarityGroups] Comparing ${allEssays[i].essayId} & ${allEssays[j].essayId} -> similarity: ${similarity}`);
      if (similarity >= SIMILARITY_THRESHOLD) {
        // Find the essay info from groups
        let foundEssay: DuplicateEssayGroup["essays"][0] | null = null;
        for (const [, essays] of groups.entries()) {
          const found = essays.find((e) => e.essayId === allEssays[j].essayId);
          if (found) {
            foundEssay = found;
            break;
          }
        }
        if (foundEssay) {
          similarEssays.push(foundEssay);
          processedEssays.add(allEssays[j].essayId);
        }
      }
    }

    if (similarEssays.length >= 2) {
      similarityGroups.push(similarEssays);
    }
  }

  // Add similarity groups to duplicate groups
  for (const similarGroup of similarityGroups) {
    // Use a combined hash for the group
    const combinedHash = similarGroup
      .map((e) => e.essayId)
      .sort()
      .join("-");
    duplicateGroups.push({
      contentHash: combinedHash,
      essays: similarGroup,
    });
  }

  console.log(`[processSimilarityGroups] Final duplicate groups: ${duplicateGroups.length}`);
  return duplicateGroups;
};

// // Detect duplicate essays across different programs for an activity
export const fetchDuplicateEssays = async (
  activityId: string,
): Promise<DuplicateEssayGroup[]> => {
  try {
    const activityDbId = resolveActivityIdForEssayFilter(activityId);
    if (activityDbId == null) {
      return [];
    }

    // 1. Find the course and all related activities
    console.log(`[fetchDuplicateEssays] Start for activity ${activityDbId}`);
    const { data: activityData, error: activityError } = await supabase
      .from("essay_activities")
      .select(`
        id,
        course_id,
        block_id,
        title
      `)
      .eq("id", activityDbId)
      .maybeSingle();

    if (activityError) {
      console.error("[fetchDuplicateEssays] Error fetching activity data:", activityError);
    }

    let activityIds: string[] = [activityDbId];
    console.log(`[fetchDuplicateEssays] Activity data:`, activityData);
    
    // 1b. Resolve related activities manually via course relationships
    if (activityData?.block_id) {
       try {
         const bid = Array.isArray(activityData.block_id) ? activityData.block_id[0] : activityData.block_id;
         if (bid) {
           const { data: blockCourseData } = await supabase
            .from("blocks")
            .select(`
              teacher_program_loads!program_load_id(
                teacher_course_loads!course_load_id(
                  course_id
                )
              )
            `)
            .eq("id", bid)
            .maybeSingle();
           
           const courseId = (blockCourseData?.teacher_program_loads as any)?.teacher_course_loads?.course_id;
           console.log(`[fetchDuplicateEssays] Found course ID via blocks: ${courseId}`);
           if (courseId) {
               const { data: relatedActivities } = await supabase
                .from("essay_activities")
                .select("id")
                .eq("course_id", courseId)
                .eq("title", activityData.title); // Only match same-named assignments
              
              if (relatedActivities && relatedActivities.length > 0) {
                activityIds = [...new Set([...activityIds, ...relatedActivities.map(a => a.id)])];
              }
           }
         }
       } catch (e) {
         console.warn("[fetchDuplicateEssays] Manual course resolution failed:", e);
       }
    }
    
    // Also try directly via course_id column
    const courseIdFromCol = activityData?.course_id;
    if (courseIdFromCol) {
      const { data: relatedByCol } = await supabase
        .from("essay_activities")
        .select("id")
        .eq("course_id", Array.isArray(courseIdFromCol) ? courseIdFromCol[0] : courseIdFromCol)
        .eq("title", activityData.title); // Only match same-named assignments
      
      if (relatedByCol && relatedByCol.length > 0) {
        activityIds = [...new Set([...activityIds, ...relatedByCol.map(a => a.id)])];
      }
    }

    console.log(`[fetchDuplicateEssays] Final activity IDs for check:`, activityIds);

    // 2. Fetch analysis results for all targeted activities (Simple pass)
    const { data: results, error } = await supabase
      .from("essay_analysis_results")
      .select("essay_id, student_id, original_text, generated_at, activity_id")
      .in("activity_id", activityIds);

    if (error) {
      console.error("[fetchDuplicateEssays] Error fetching analysis results:", error);
    }

    let analysisResults = results || [];
    console.log(`[fetchDuplicateEssays] Initial analysis results found:`, analysisResults.length);

    // Fallback: fetch from essays table if no analysis results yet
    if (analysisResults.length === 0) {
      const { data: fallbackEssays, error: essaysError } = await supabase
        .from("essays")
        .select("id, student_id, content, title, submitted_at, block_id, activity_id")
        .in("activity_id", activityIds);

      if (essaysError) {
        console.error("[fetchDuplicateEssays] Fallback query error:", essaysError);
      }

      if (!fallbackEssays || fallbackEssays.length === 0) {
        return [];
      }
      
      analysisResults = fallbackEssays.map(e => ({
        essay_id: e.id,
        student_id: e.student_id,
        activity_id: e.activity_id, // Keep track of activity ID
        original_text: (e as any).content || "",
        _fallback_essay: e
      })) as any;
      console.log(`[fetchDuplicateEssays] Using fallback essays:`, analysisResults.length);
    }

    // 3. Fetch missing metadata (Metadata pass) completely without complex joins
    const essayIds = analysisResults.map(r => r.essay_id);
    const blockIds = [...new Set(analysisResults.map(r => (r as any)._fallback_essay?.block_id).filter(Boolean))];
    const studentIds = [...new Set(analysisResults.map(r => r.student_id).filter(Boolean))];

    // Fetch basic essay fields
    const { data: basicEssays, error: metaError } = await supabase
      .from("essays")
      .select("id, title, submitted_at, block_id, student_id, activity_id")
      .in("id", essayIds);

    if (metaError) {
       console.error("[fetchDuplicateEssays] Error fetching basic essays:", metaError);
    }
    
    // Add block_ids from basicEssays
    basicEssays?.forEach(e => {
       if (e.block_id && !blockIds.includes(e.block_id)) blockIds.push(e.block_id);
    });

    // Fallback: If any student has no block associated via their essay, try to fetch their enrollment
    const { data: studentBlocks } = await supabase
      .from("block_students")
      .select("student_id, block_id")
      .in("student_id", studentIds);

    const studentBlockMap = new Map();
    studentBlocks?.forEach(sb => {
      studentBlockMap.set(String(sb.student_id), sb.block_id);
      if (!blockIds.includes(sb.block_id)) blockIds.push(sb.block_id);
    });

    // Fetch students
    const { data: students } = await supabase
      .from("users")
      .select("id, first_name, last_name, middle_name, suffix, student_code")
      .in("id", studentIds)
      .eq("role", "student");
      
    // Fetch blocks with their program_load_id
    const { data: blocksData } = await supabase
      .from("blocks")
      .select("id, name, year, program_load_id")
      .in("id", blockIds);
      
    const loadIds = [...new Set(blocksData?.map(b => b.program_load_id).filter(Boolean))];
    
    // Fetch program loads
    const { data: loadsData } = await supabase
      .from("teacher_program_loads")
      .select("id, program_id")
      .in("id", loadIds);
      
    const programIds = [...new Set(loadsData?.map(l => l.program_id).filter(Boolean))];
    
    // Add programs directly attached to students
    students?.forEach((s: any) => {
      if (s.program_id && !programIds.includes(s.program_id)) programIds.push(s.program_id);
    });
    
    // Fetch programs
    const { data: programsData } = await supabase
      .from("programs_lookup")
      .select("id, name, abbr")
      .in("id", programIds);

    // Build Maps for fast lookup
    const studentsMap = new Map();
    students?.forEach((s: any) => studentsMap.set(String(s.id), s));
    
    const programsMap = new Map();
    programsData?.forEach(p => programsMap.set(String(p.id), p));
    
    const loadsMap = new Map();
    loadsData?.forEach(l => {
       const prog = programsMap.get(String(l.program_id));
       if (prog) loadsMap.set(String(l.id), prog);
    });
    
    const blocksMap = new Map();
    blocksData?.forEach(b => {
       const prog = loadsMap.get(String(b.program_load_id));
       blocksMap.set(String(b.id), { ...b, program: prog });
    });
    
    const metaMap = new Map();
    basicEssays?.forEach(m => metaMap.set(String(m.id), m));
    
    console.log(`[fetchDuplicateEssays] Metadata fetched. Found ${basicEssays?.length} essays, ${students?.length} students, ${blocksData?.length} blocks.`);

    // Group essays by content hash
    const contentGroups = new Map<string, DuplicateEssayGroup["essays"]>();

    for (const result of analysisResults) {
      const originalText = result.original_text;
      
      console.log(`[fetchDuplicateEssays] Processing essay ${result.essay_id}. Text length: ${originalText?.length}`);

      if (!originalText || originalText.trim().length < 50) {
        console.log(`[fetchDuplicateEssays] Skipped essay ${result.essay_id}: Text too short.`);
        continue;
      }

      const meta = metaMap.get(String(result.essay_id));
      const fallback = (result as any)._fallback_essay;
      
      const title = meta?.title || fallback?.title || "Untitled";
      const submittedAt = meta?.submitted_at || fallback?.submitted_at || new Date().toISOString();
      const studentId = meta?.student_id || result.student_id;
      // Use essay block, or fallback essay block, or finally the student's enrolled block
      const blockId = meta?.block_id || fallback?.block_id || studentBlockMap.get(String(studentId));

      const student = studentsMap.get(String(studentId));
      const block = blocksMap.get(String(blockId));
      
      const program = block?.program || (student?.program_id ? programsMap.get(String(student.program_id)) : null);

      if (!student) {
        console.log(`[fetchDuplicateEssays] Skipped essay ${result.essay_id}: Missing student metadata.`);
        continue;
      }

      // Fallback section name to student direct table columns
      let resolvedSectionName = "Unknown";
      if (block?.name) {
        resolvedSectionName = block.year ? `${block.year}${block.name}` : block.name;
      } else if (student?.block_name) {
        resolvedSectionName = student.year ? `${student.year}${student.block_name}` : student.block_name;
      }

      const essayInfo = {
        essayId: String(result.essay_id),
        studentId: String(student.id),
        studentName: buildFullNameFromObject(student, "Unknown"),
        programName: program?.abbr || program?.name || "Unknown",
        sectionName: resolvedSectionName,
        title: title,
        submittedAt: submittedAt,
        activityId: String(meta?.activity_id || fallback?.activity_id || (result as any).activity_id),
      };

      const contentHash = generateContentHash(originalText);
      if (!contentGroups.has(contentHash)) {
        contentGroups.set(contentHash, []);
      }
      contentGroups.get(contentHash)!.push(essayInfo);
    }

    console.log(`[fetchDuplicateEssays] Content groups built:`, contentGroups.size);

    // Continue with similarity matching using the simple results list
    const finalGroups = processSimilarityGroups(
      contentGroups,
      analysisResults.map((r) => ({
        id: String(r.essay_id),
        content: r.original_text || null,
      })),
      "content",
    );

    // 4. Narrowing filter: Only return groups that have AT LEAST ONE essay matching the requested activityId.
    // This removes groups that are entirely composed of submissions from "Other" activities in the same course.
    return finalGroups.filter(group => 
      group.essays.some(e => e.activityId === activityDbId)
    );
  } catch (err) {
    console.error("Error in fetchDuplicateEssays:", err);
    return [];
  }
};

// Get activities that have duplicate essays
export const fetchActivitiesWithDuplicates = async (): Promise<
  EssayActivity[]
> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      console.error("Teacher ID not available");
      return [];
    }

    // Fetch all activities
    const activities = await fetchTeacherActivities();
    if (activities.length === 0) {
      return [];
    }

    // Check each activity for duplicates
    const activitiesWithDuplicates: EssayActivity[] = [];
    for (const activity of activities) {
      const duplicates = await fetchDuplicateEssays(activity.id);
      if (duplicates.length > 0) {
        activitiesWithDuplicates.push(activity);
      }
    }

    return activitiesWithDuplicates;
  } catch (err) {
    console.error("Error fetching activities with duplicates:", err);
    return [];
  }
};

// Comparison types
export interface ComparisonHighlight {
  start: number;
  end: number;
  text: string;
  studentIndex: number;
}


// Fetch all students who submitted essays for an activity
export const fetchStudentsForActivity = async (
  activityId: string,
): Promise<
  Array<{
    id: string;
    studentId: string;
    essayId: string;
    name: string;
    programName: string;
    sectionName: string;
    hasEssay: boolean;
  }>
> => {
  try {
    const activityDbId = activityId;
    if (!activityDbId) {
      return [];
    }

    // Fetch all essays for this activity with student and section info
    const { data: essaysData, error } = await supabase
      .from("essays")
      .select(
        `
        id,
        student_id,
        block_id,
        students:users!essays_student_id_fkey(
          id,
          first_name,
          middle_name,
          last_name
        ),
        blocks!essays_block_id_fkey(
          id,
          name,
          teacher_program_loads!fk_block_program_load(
            programs_lookup(
              id,
              name,
              abbr
            )
          )
        )
      `,
      )
      .eq("activity_id", activityDbId);

    if (error || !essaysData) {
      console.error("Error fetching students for activity:", error);
      return [];
    }

    // Map to expected format
    // Supabase returns nested data as an object (not array) when using !inner
    type EssayWithStudentData = {
      id: string;  // uuid
      student_id: string;  // uuid
      block_id: string | null;  // uuid
      students: {
        id: string;  // uuid
        first_name: string;
        middle_name: string | null;
        last_name: string;
      };
      blocks: {
        id: number;
        name: string;
        teacher_program_loads?: {
          programs_lookup?: {
            id: string;
            name: string;
            abbr: string | null;
          };
        } | null;
      };
    };

    return (essaysData as unknown as EssayWithStudentData[]).map((essay) => {
      const student = essay.students;
      const block = essay.blocks;
      const program = block?.teacher_program_loads?.programs_lookup;

      return {
        id: String(student.id),
        studentId: String(student.id),
        essayId: String(essay.id),
        name: buildFullNameFromObject(student, "Unknown"),
        programName: program?.abbr || program?.name || "Unknown",
        sectionName: block?.name || "Unknown",
        hasEssay: true,
      } as const;
    });
  } catch (err) {
    console.error("Error fetching students for activity:", err);
    return [];
  }
};

// Fetch essay texts for multiple students at once (for comparison)
export const fetchEssayTextsForStudents = async (
  studentIds: string[],
  activityId: string,
): Promise<
  Array<{
    studentId: string;
    text: string;
    essayId: string;
    studentName: string;
  }>
> => {
  try {
    const activityDbId = activityId;
    if (!activityDbId || studentIds.length === 0) {
      return [];
    }

    // Fetch essays for these students
    const { data: essaysData, error: essaysError } = await supabase
      .from("essays")
      .select(
        "id, student_id, students:users!essays_student_id_fkey(id, first_name, middle_name, last_name)",
      )
      .eq("activity_id", activityDbId)
      .in("student_id", studentIds);

    if (essaysError || !essaysData || essaysData.length === 0) {
      return [];
    }

    // Type definitions for Supabase query results
    type EssayWithStudent = {
      id: string;  // uuid
      student_id: string;  // uuid
      students: {
        id: string;  // uuid
        first_name: string;
        middle_name: string | null;
        last_name: string;
      };
    };

    type AnalysisDataItem = {
      essay_id: string;  // uuid
      original_text: string | null;
    };

    const essayIds = (essaysData as unknown as EssayWithStudent[]).map(
      (e) => e.id,
    );

    // Fetch original_text from essay_analysis_results
    const { data: analysisData, error: analysisError } = await supabase
      .from("essay_analysis_results")
      .select("essay_id, original_text")
      .in("essay_id", essayIds);

    if (analysisError) {
      console.error("Error fetching analysis data:", analysisError);
    }

    // Create a map of essay_id -> original_text
    const textMap = new Map<string, string>();
    if (analysisData) {
      (analysisData as unknown as AnalysisDataItem[]).forEach((item) => {
        if (item.original_text) {
          textMap.set(String(item.essay_id), item.original_text);
        }
      });
    }

    // Combine data
    const results = (essaysData as unknown as EssayWithStudent[]).map(
      (essay) => {
        const student = Array.isArray(essay.students)
          ? essay.students[0]
          : essay.students;
        return {
          studentId: String(essay.student_id),
          text: textMap.get(String(essay.id)) || "",
          essayId: String(essay.id),
          studentName: buildFullNameFromObject(student, "Unknown"),
        };
      },
    );

    return results;
  } catch (err) {
    console.error("Error fetching essay texts for students:", err);
    return [];
  }
};

// Fetch essay text content for comparison
export const fetchEssayText = async (
  studentId: string,
  activityId: string,
): Promise<{ text: string; essayId: string } | null> => {
  try {
    const studentDbId = studentId;
    const activityDbId = activityId;

    if (!studentDbId || !activityDbId) {
      return null;
    }

    // First try to get from essay_analysis_results
    const { data: essayData } = await supabase
      .from("essays")
      .select("id")
      .eq("student_id", studentDbId)
      .eq("activity_id", activityDbId)
      .single();

    if (!essayData) {
      return null;
    }

    const { data: analysisData } = await supabase
      .from("essay_analysis_results")
      .select("original_text, essay_id")
      .eq("essay_id", essayData.id)
      .single();

    if (analysisData?.original_text) {
      return {
        text: analysisData.original_text,
        essayId: essayData.id,
      };
    }

    // Fallback: return empty (text extraction would need OCR)
    return {
      text: "",
      essayId: essayData.id,
    };
  } catch (err) {
    console.error("Error fetching essay text:", err);
    return null;
  }
};

// Save comparison analysis
export const saveComparisonAnalysis = async (
  comparison: ComparisonAnalysis,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher ID not available" };
    }

    const activityDbId = comparison.activityId;
    if (!activityDbId) {
      return { success: false, error: "Invalid activity ID" };
    }

    const { data, error } = await supabase
      .from("essay_comparisons")
      .insert({
        activity_id: activityDbId,
        user_id: teacherId,
        student_ids: comparison.studentIds,
        essay_ids: comparison.essayIds,
        insights: comparison.insights,
        similarity_highlights: comparison.highlights,
        similarity_score: comparison.similarityScore || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving comparison:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error("Error saving comparison:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

// Fetch comparison history for an activity
export const fetchComparisonHistory = async (
  activityId: string,
): Promise<ComparisonAnalysis[]> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      return [];
    }

    const activityDbId = activityId;
    if (!activityDbId) {
      return [];
    }

    const { data, error } = await supabase
      .from("essay_comparisons")
      .select("*")
      .eq("activity_id", activityDbId)
      .eq("user_id", teacherId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Error fetching comparison history:", error);
      return [];
    }

    type EssayComparisonRow = {
      id: string;  // uuid
      activity_id: string;  // uuid
      user_id: string;  // uuid
      student_ids: string[];  // uuid[]
      essay_ids: string[];  // uuid[]
      insights: string;
      similarity_highlights: ComparisonHighlight[];
      similarity_score: number | null;
      created_at: string;
      updated_at: string;
    };

    return data.map((row: EssayComparisonRow) => ({
      id: String(row.id),
      activityId: String(row.activity_id),
      studentIds: row.student_ids || [],
      essayIds: row.essay_ids || [],
      insights: row.insights || "",
      highlights: row.similarity_highlights || [],
      similarityScore: row.similarity_score ?? undefined,
      createdAt: row.created_at,
    } as ComparisonAnalysis));
  } catch (err) {
    console.error("Error fetching comparison history:", err);
    return [];
  }
};

// Analyze essays for similarity using LLM (calls backend API)
export const analyzeEssaySimilarity = async (
  essayTexts: string[],
  studentNames: string[],
): Promise<{
  insights: string;
  highlights: ComparisonHighlight[];
  similarityScore: number;
}> => {
  try {
    // Call backend API for LLM analysis
    // For now, using a mock - user should implement the backend endpoint
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    const response = await fetch(`${API_URL}/api/analysis/comparison`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        essay_texts: essayTexts,
        student_names: studentNames,
      }),
    });

    if (!response.ok) {
      throw new Error("Analysis failed");
    }

    const data = await response.json();
    return {
      insights: data.insights || "Analysis completed",
      highlights: data.highlights || [],
      similarityScore: data.similarity_score || 0,
    };
  } catch (err) {
    console.error("Error analyzing similarity:", err);
    // Fallback: return basic analysis
    return {
      insights:
        "Similarity analysis is currently unavailable. Please check your backend configuration.",
      highlights: [],
      similarityScore: 0,
    };
  }
};

// Metrics types
export interface TeacherMetrics {
  // Key metrics
  avgGrammarScore: number;
  avgCoherenceScore: number;
  avgVocabularyLevel: number;
  plagiarismRisk: number;

  // Section performance
  sectionPerformance: SectionPerformanceData[];

  // Grammar trends (weekly)
  grammarTrends: GrammarTrendData[];

  // Coherence distribution
  coherenceDistribution: CoherenceDistributionData[];

  // Vocabulary complexity
  vocabularyComplexity: VocabularyComplexityData[];

  // Top performers
  topPerformers: Array<{
    name: string;
    avgScore: number;
    essays: number;
    improvement: string;
  }>;

  // At-risk students
  atRiskStudents: Array<{
    name: string;
    avgScore: number;
    essays: number;
    trend: "up" | "down" | "stable";
    issues: string[];
  }>;
}

export interface SectionPerformanceData {
  section: string;
  avgScore: number;
}

export interface GrammarTrendData {
  week: string;
  errors: number;
}

export interface CoherenceDistributionData {
  range: string;
  count: number;
}

export interface VocabularyComplexityData {
  level: string;
  value: number;
  color: string;
  [key: string]: unknown;
}

// Fetch teacher metrics from database
export const fetchTeacherMetrics = async (): Promise<TeacherMetrics> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      console.error("Teacher ID not available");
      return getEmptyMetrics();
    }

    // Fetch all analysis results for this teacher
    const { data: analysisResults, error: analysisError } = await supabase
      .from("essay_analysis_results")
      .select(
        `
        *,
        essays!essays_id_fkey(
          id,
          submitted_at,
          block_id,
          students:users!essays_student_id_fkey(
            id,
            first_name,
            middle_name,
            last_name
          ),
          blocks!essays_block_id_fkey(
            id,
            name,
            teacher_program_loads!fk_block_program_load(
              programs_lookup(
                id,
                name,
                abbr
              )
            )
          )
        )
      `,
      )
      .eq("user_id", teacherId)
      .order("generated_at", { ascending: false });

    if (analysisError) {
      console.error("Error fetching analysis results:", analysisError);
      return getEmptyMetrics();
    }

    if (!analysisResults || analysisResults.length === 0) {
      return getEmptyMetrics();
    }

    // Calculate key metrics
    const grammarScores = analysisResults
      .map((r) => r.grammar_score)
      .filter((s): s is number => s !== null && s !== undefined);
    const coherenceScores = analysisResults
      .map((r) => r.coherence_score)
      .filter((s): s is number => s !== null && s !== undefined);
    const readabilityScores = analysisResults
      .map((r) => r.readability_score)
      .filter((s): s is number => s !== null && s !== undefined);

    const avgGrammarScore =
      grammarScores.length > 0
        ? grammarScores.reduce((a, b) => a + b, 0) / grammarScores.length
        : 0;
    const avgCoherenceScore =
      coherenceScores.length > 0
        ? coherenceScores.reduce((a, b) => a + b, 0) / coherenceScores.length
        : 0;
    const avgVocabularyLevel =
      readabilityScores.length > 0
        ? readabilityScores.reduce((a, b) => a + b, 0) /
          readabilityScores.length /
          10
        : 0;

    // Calculate plagiarism risk (simplified - based on duplicate detection)
    // This would ideally use actual plagiarism detection results
    const plagiarismRisk = 2.3; // Placeholder - would need plagiarism detection data

    // Calculate section performance
    const sectionMap = new Map<string, { total: number; count: number }>();
    for (const result of analysisResults) {
      type EssayWithNested = {
        students?: {
          sections?: {
            name?: string;
          };
        };
      };
      const essay = result.essays as EssayWithNested | null | undefined;
      const student = essay?.students;
      const section = student?.sections;
      if (section?.name && result.overall_score !== null) {
        const sectionName = section.name;
        const existing = sectionMap.get(sectionName) || { total: 0, count: 0 };
        sectionMap.set(sectionName, {
          total: existing.total + (result.overall_score || 0),
          count: existing.count + 1,
        });
      }
    }
    const sectionPerformance: SectionPerformanceData[] = Array.from(
      sectionMap.entries(),
    ).map(([section, data]) => ({
      section,
      avgScore: data.count > 0 ? data.total / data.count : 0,
    }));

    // Calculate grammar trends (weekly)
    const grammarTrends: GrammarTrendData[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekResults = analysisResults.filter((r) => {
        const generatedAt = new Date(r.generated_at);
        return generatedAt >= weekStart && generatedAt < weekEnd;
      });

      const totalErrors = weekResults.reduce((sum, r) => {
        type DetailedAnalysis = {
          grammar?: {
            errors?: unknown[];
          };
        };
        const detailedAnalysis = r.detailed_analysis as
          | DetailedAnalysis
          | null
          | undefined;
        const grammarErrors = detailedAnalysis?.grammar?.errors || [];
        return sum + grammarErrors.length;
      }, 0);

      grammarTrends.push({
        week: `Week ${8 - i}`,
        errors: totalErrors,
      });
    }

    // Calculate coherence distribution
    const coherenceRanges = {
      "90-100": 0,
      "80-89": 0,
      "70-79": 0,
      "60-69": 0,
      "<60": 0,
    };
    for (const result of analysisResults) {
      const score = result.coherence_score;
      if (score !== null && score !== undefined) {
        if (score >= 90) coherenceRanges["90-100"]++;
        else if (score >= 80) coherenceRanges["80-89"]++;
        else if (score >= 70) coherenceRanges["70-79"]++;
        else if (score >= 60) coherenceRanges["60-69"]++;
        else coherenceRanges["<60"]++;
      }
    }
    const coherenceDistribution: CoherenceDistributionData[] = [
      { range: "90-100", count: coherenceRanges["90-100"] },
      { range: "80-89", count: coherenceRanges["80-89"] },
      { range: "70-79", count: coherenceRanges["70-79"] },
      { range: "60-69", count: coherenceRanges["60-69"] },
      { range: "<60", count: coherenceRanges["<60"] },
    ];

    // Calculate vocabulary complexity
    const vocabularyLevels = { Advanced: 0, Intermediate: 0, Basic: 0 };
    for (const result of analysisResults) {
      const readability = result.readability_score;
      if (readability !== null && readability !== undefined) {
        if (readability >= 80) vocabularyLevels.Advanced++;
        else if (readability >= 60) vocabularyLevels.Intermediate++;
        else vocabularyLevels.Basic++;
      }
    }
    const totalVocab =
      vocabularyLevels.Advanced +
      vocabularyLevels.Intermediate +
      vocabularyLevels.Basic;
    const vocabularyComplexity: VocabularyComplexityData[] = [
      {
        level: "Advanced",
        value:
          totalVocab > 0
            ? Math.round((vocabularyLevels.Advanced / totalVocab) * 100)
            : 0,
        color: "#10B981",
      },
      {
        level: "Intermediate",
        value:
          totalVocab > 0
            ? Math.round((vocabularyLevels.Intermediate / totalVocab) * 100)
            : 0,
        color: "#38BDF8",
      },
      {
        level: "Basic",
        value:
          totalVocab > 0
            ? Math.round((vocabularyLevels.Basic / totalVocab) * 100)
            : 0,
        color: "#F59E0B",
      },
    ];

    // Calculate top performers
    const studentScores = new Map<
      number,
      { name: string; scores: number[]; essayCount: number }
    >();
    for (const result of analysisResults) {
      type EssayWithStudent = {
        students?: {
          id?: number;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
        };
      };
      const essay = result.essays as EssayWithStudent | null | undefined;
      const student = essay?.students;
      if (student?.id && result.overall_score !== null) {
        const existing = studentScores.get(student.id) || {
          name: buildFullNameFromObject(student, "Unknown"),
          scores: [],
          essayCount: 0,
        };
        existing.scores.push(result.overall_score || 0);
        existing.essayCount++;
        studentScores.set(student.id, existing);
      }
    }
    const topPerformers = Array.from(studentScores.entries())
      .map(([, data]) => ({
        name: data.name,
        avgScore: Math.round(
          data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        ),
        essays: data.essayCount,
        improvement: "+" + Math.round(Math.random() * 5) + "%", // Placeholder
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);

    // Calculate at-risk students (low scores)
    const atRiskStudents = Array.from(studentScores.entries())
      .map(([, data]) => {
        const avgScore = Math.round(
          data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        );
        const issues: string[] = [];
        // Determine issues based on scores
        if (avgScore < 70) {
          issues.push("Overall Performance");
        }
        return {
          name: data.name,
          avgScore,
          essays: data.essayCount,
          trend: "down" as const,
          issues: issues.length > 0 ? issues : ["Needs Improvement"],
        };
      })
      .filter((s) => s.avgScore < 70)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 5);

    return {
      avgGrammarScore: Math.round(avgGrammarScore * 10) / 10,
      avgCoherenceScore: Math.round(avgCoherenceScore * 10) / 10,
      avgVocabularyLevel: Math.round(avgVocabularyLevel * 10) / 10,
      plagiarismRisk,
      sectionPerformance,
      grammarTrends,
      coherenceDistribution,
      vocabularyComplexity,
      topPerformers,
      atRiskStudents,
    };
  } catch (err) {
    console.error("Error fetching teacher metrics:", err);
    return getEmptyMetrics();
  }
};

// Helper function to return empty metrics
function getEmptyMetrics(): TeacherMetrics {
  return {
    avgGrammarScore: 0,
    avgCoherenceScore: 0,
    avgVocabularyLevel: 0,
    plagiarismRisk: 0,
    sectionPerformance: [],
    grammarTrends: [],
    coherenceDistribution: [],
    vocabularyComplexity: [],
    topPerformers: [],
    atRiskStudents: [],
  };
}

// Save plagiarism check results to essay_analysis_results table
// Can be called with either (studentId, activityId) or essayId
export const savePlagiarismResult = async (
  studentIdOrEssayId: string,
  activityIdOrResult:
    | string
    | import("../api").PlagiarismCheckResponse
    | undefined,
  plagiarismResult?: import("../api").PlagiarismCheckResponse,
): Promise<{ success: boolean; error?: string }> => {
  try {
    let essayId: string;
    let result: import("../api").PlagiarismCheckResponse;

    // Determine which overload is being used
    if (typeof activityIdOrResult === "object" && activityIdOrResult !== null) {
      if (typeof studentIdOrEssayId === "number") {
        if (Number.isNaN(studentIdOrEssayId)) {
          return { success: false, error: "Invalid essay ID" };
        }
        essayId = studentIdOrEssayId;
      } else {
        const coerced = coerceEssayIdParam(studentIdOrEssayId);
        if (coerced == null) {
          return { success: false, error: "Invalid essay ID" };
        }
        essayId = coerced;
      }
      result = activityIdOrResult;
    } else if (plagiarismResult) {
      // Called with (studentId, activityId, plagiarismResult)
      const studentId = studentIdOrEssayId as string;
      const activityId = activityIdOrResult as string;

      const studentDbId = await resolveStudentIdForEssayFilter(studentId);
      const activityDbId = resolveActivityIdForEssayFilter(activityId);
      if (studentDbId == null) {
        return { success: false, error: "Student not found" };
      }
      if (activityDbId == null) {
        return { success: false, error: "Invalid activity ID" };
      }

      const { data: essayData, error: essayError } = await supabase
        .from("essays")
        .select("id")
        .eq("student_id", studentDbId)
        .eq("activity_id", activityDbId)
        .maybeSingle();

      if (essayError || !essayData) {
        return { success: false, error: "Essay not found" };
      }

      essayId = essayData.id as string;
      result = plagiarismResult;
    } else {
      return { success: false, error: "Invalid parameters" };
    }

    if (
      essayId == null ||
      (typeof essayId === "number" && Number.isNaN(essayId))
    ) {
      return { success: false, error: "Invalid essay ID" };
    }

      // 1. Primary path: Upsert to essay_analysis_results
      // We use upsert to create the row if it doesn't exist yet (e.g., if plagiarism check is run before full analysis)
      const { error: upsertError } = await supabase
        .from("essay_analysis_results")
        .upsert({
          essay_id: essayId,
          plagiarism_results: result,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'essay_id' });

      if (upsertError) {
        console.error("Error upserting plagiarism results to essay_analysis_results:", upsertError);
        // If primary fails, we'll try fallback, but we won't return yet
      } else {
        console.log("Successfully saved plagiarism results to essay_analysis_results for essay_id:", essayId);
        // If primary worked, we still try fallback as backup, but it's not critical
      }

      // 2. Secondary path: Save to essays table (as the 'analysis' JSONB column fallback)
      // We wrap this in a try-catch and don't fail if it fails, because the schema cache might be stale
      try {
        const { data: essayStatus } = await supabase.from("essays").select("analysis").eq("id", essayId).maybeSingle();
        const currentAnalysis = essayStatus?.analysis || {};
        
        const { error: essayUpdateError } = await supabase
          .from("essays")
          .update({
            analysis: {
              ...currentAnalysis,
              plagiarism_results: result
            }
          })
          .eq("id", essayId);

        if (essayUpdateError) {
          console.warn("Fallback save to essays table failed (likely schema cache issue):", essayUpdateError.message);
        }
      } catch (fallbackErr) {
        console.warn("Silent failure in fallback save:", fallbackErr);
      }

      // If upsert failed AND it's not a schema cache issue, we should report it
      // But if upsert worked, we return success regardless of fallback
      if (upsertError && !upsertError.message?.includes("PGRST204")) {
          return { success: false, error: `Failed to save results: ${upsertError.message}` };
      }

      return { success: true };
    } catch (err) {
      console.error("Error saving plagiarism result:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  };

// Load saved plagiarism check results from essay_analysis_results table
// Can be called with either (studentId, activityId) or essayId
export const loadPlagiarismResult = async (
  studentIdOrEssayId: string,
  activityId?: string,
): Promise<import("../api").PlagiarismCheckResponse | null> => {
  try {
    let essayId: string | null;

    if (activityId !== undefined) {
      const studentId = studentIdOrEssayId as string;
      const studentDbId = await resolveStudentIdForEssayFilter(studentId);
      const activityDbId = resolveActivityIdForEssayFilter(activityId);
      if (studentDbId == null || activityDbId == null) {
        return null;
      }

      const { data: essayData, error: essayError } = await supabase
        .from("essays")
        .select("id")
        .eq("student_id", studentDbId)
        .eq("activity_id", activityDbId)
        .maybeSingle();

      if (essayError || !essayData) {
        return null;
      }

      essayId = essayData.id as string;
    } else {
      if (typeof studentIdOrEssayId === "number") {
        essayId = Number.isNaN(studentIdOrEssayId)
          ? null
          : studentIdOrEssayId;
      } else {
        essayId = coerceEssayIdParam(studentIdOrEssayId);
      }
      if (essayId == null) {
        return null;
      }
    }

    const { data: analysisData, error: analysisError } = await supabase
      .from("essay_analysis_results")
      .select("plagiarism_results")
      .eq("essay_id", essayId)
      .maybeSingle();

    if (analysisError || !analysisData?.plagiarism_results) {
      return null;
    }

    return analysisData.plagiarism_results as import("../api").PlagiarismCheckResponse;
  } catch (err) {
    console.error("Error loading plagiarism result:", err);
    return null;
  }
};

// Save AI detection results to essay_analysis_results table
// Can be called with either (studentId, activityId) or essayId
export const saveAIDetectionResult = async (
  studentIdOrEssayId: string,
  activityIdOrResult:
    | string
    | import("../api").AIDetectionResponse
    | undefined,
  aiDetectionResult?: import("../api").AIDetectionResponse,
): Promise<{ success: boolean; error?: string }> => {
  try {
    let essayId: string;
    let result: import("../api").AIDetectionResponse;

    if (typeof activityIdOrResult === "object" && activityIdOrResult !== null) {
      if (typeof studentIdOrEssayId === "number") {
        if (Number.isNaN(studentIdOrEssayId)) {
          return { success: false, error: "Invalid essay ID" };
        }
        essayId = studentIdOrEssayId;
      } else {
        const coerced = coerceEssayIdParam(studentIdOrEssayId);
        if (coerced == null) {
          return { success: false, error: "Invalid essay ID" };
        }
        essayId = coerced;
      }
      result = activityIdOrResult;
    } else if (aiDetectionResult) {
      const studentId = studentIdOrEssayId as string;
      const activityId = activityIdOrResult as string;

      const studentDbId = await resolveStudentIdForEssayFilter(studentId);
      const activityDbId = resolveActivityIdForEssayFilter(activityId);
      if (studentDbId == null) {
        return { success: false, error: "Student not found" };
      }
      if (activityDbId == null) {
        return { success: false, error: "Invalid activity ID" };
      }

      const { data: essayData, error: essayError } = await supabase
        .from("essays")
        .select("id")
        .eq("student_id", studentDbId)
        .eq("activity_id", activityDbId)
        .maybeSingle();
      if (essayError || !essayData) {
        return { success: false, error: "Essay not found" };
      }

      essayId = essayData.id as string;
      result = aiDetectionResult;
    } else {
      return { success: false, error: "Invalid parameters" };
    }

    if (
      essayId == null ||
      (typeof essayId === "number" && Number.isNaN(essayId))
    ) {
      return { success: false, error: "Invalid essay ID" };
    }

    // 1. Primary path: Upsert to essay_analysis_results
    const { error: upsertError } = await supabase
      .from("essay_analysis_results")
      .upsert({
        essay_id: essayId,
        ai_detection_results: result,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'essay_id' });

    if (upsertError) {
      console.error("Error upserting AI detection results to essay_analysis_results:", upsertError);
    } else {
      console.log("Successfully saved AI detection results to essay_analysis_results for essay_id:", essayId);
    }

    // 2. Secondary path: Save to essays table (as fallback)
    try {
      const { data: essayStatus } = await supabase.from("essays").select("analysis").eq("id", essayId).maybeSingle();
      const currentAnalysis = essayStatus?.analysis || {};
      
      const { error: essayUpdateError } = await supabase
        .from("essays")
        .update({
          analysis: {
            ...currentAnalysis,
            ai_detection_results: result
          }
        })
        .eq("id", essayId);

      if (essayUpdateError) {
        console.warn("Fallback save to essays table failed (likely schema cache issue):", essayUpdateError.message);
      }
    } catch (fallbackErr) {
       console.warn("Silent failure in fallback save:", fallbackErr);
    }

    return { success: true };
  } catch (err) {
    console.error("Error saving AI detection result:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

// Load saved AI detection results from essay_analysis_results table
// Can be called with either (studentId, activityId) or essayId
export const loadAIDetectionResult = async (
  studentIdOrEssayId: string,
  activityId?: string,
): Promise<import("../api").AIDetectionResponse | null> => {
  try {
    let essayId: string | null;

    if (activityId !== undefined) {
      const studentId = studentIdOrEssayId as string;
      const studentDbId = await resolveStudentIdForEssayFilter(studentId);
      const activityDbId = resolveActivityIdForEssayFilter(activityId);
      if (studentDbId == null || activityDbId == null) {
        return null;
      }

      const { data: essayData, error: essayError } = await supabase
        .from("essays")
        .select("id")
        .eq("student_id", studentDbId)
        .eq("activity_id", activityDbId)
        .maybeSingle();
      if (essayError || !essayData) {
        return null;
      }
      essayId = essayData.id as string;
    } else {
      if (typeof studentIdOrEssayId === "number") {
        essayId = Number.isNaN(studentIdOrEssayId)
          ? null
          : studentIdOrEssayId;
      } else {
        essayId = coerceEssayIdParam(studentIdOrEssayId);
      }
      if (essayId == null) {
        return null;
      }
    }

    const { data: analysisData, error: analysisError } = await supabase
      .from("essay_analysis_results")
      .select("ai_detection_results")
      .eq("essay_id", essayId)
      .maybeSingle();

    if (analysisError || !analysisData?.ai_detection_results) {
      return null;
    }

    return analysisData.ai_detection_results as import("../api").AIDetectionResponse;
  } catch (err) {
    console.error("Error loading AI detection result:", err);
    return null;
  }
};
