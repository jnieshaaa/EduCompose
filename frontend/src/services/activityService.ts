// Activity service for data operations

import { supabase } from "../lib/supabaseClient";
import type { EssayActivity, NewActivityForm } from "../types/activityTypes";
import { fetchTeacherId, fetchTeacherUUID } from "./rubricService";
import { buildFullNameFromObject } from "../utils/nameUtils";

/**
 * Fetches necessary information to build a full breadcrumb and navigation context.
 */
export const fetchActivityBreadcrumbInfo = async (
  activityId: string | number, 
  studentId?: string | number,
  essayId?: string | number
) => {
  try {
    const actId = typeof activityId === 'string' ? parseInt(activityId) : activityId;
    if (isNaN(actId)) return null;

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
      const pId = Array.isArray(activity.program_id) ? activity.program_id[0] : activity.program_id;
      const { data: prog } = await supabase.from("programs_lookup").select("abbr").eq("id", pId).single();
      if (prog) programAbbr = prog.abbr;
    }

    // 3. Resolve Course Info
    if (activity.course_id && activity.course_id.length > 0) {
      courseId = Array.isArray(activity.course_id) ? activity.course_id[0] : activity.course_id;
      const { data: course } = await supabase.from("courses").select("course_title, course_code").eq("id", courseId).single();
      if (course) courseName = course.course_title || course.course_code;
    }

    // 4. Resolve Section/Block Info (if targeted)
    if (essayId) {
      const { data: essay } = await supabase.from("essays").select("block_id").eq("id", essayId).single();
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
      const { data: block } = await supabase.from("blocks").select("year, name").eq("id", sectionId).single();
      if (block) courseSectionName = `${block.year}${block.name}`;
    }

    return {
      activityId: activity.id,
      activityTitle: activity.title,
      programAbbr,
      courseName,
      courseId,
      sectionId,
      courseSection: courseSectionName
    };
  } catch (err) {
    console.error("Error fetching breadcrumb/navigation info:", err);
    return null;
  }
};

// Supabase row type for essay_activities
type SupabaseActivityRow = {
  id: number;
  teacher_id: string | null;
  title: string;
  program_id: string[] | null;
  block_id: string[] | null;
  course_id: string[] | null;
  rubric_id: number | null;
  due_date: string | null;
  instructions: string | null;
  academic_year: string | null;
  term: string | null;
  min_word_count: number;
  created_at: string;
  rubrics?:
    | { id: number; name: string }
    | { id: number; name: string }[]
    | null;
};

// Load activities for the current teacher with optional academic context filtering
export const fetchTeacherActivities = async (
  academicYear?: string,
  term?: string,
  showArchived: boolean = false,
  currentAY?: string,
  currentTerm?: string,
): Promise<EssayActivity[]> => {
  try {
    const teacherId = await fetchTeacherUUID();
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
      if (academicYear && academicYear !== "all") query = query.eq("academic_year", academicYear);
      if (term && term !== "all") query = query.eq("term", term);
    } else {
      // Archive view: apply specific filters
      if (academicYear && academicYear !== "all") query = query.eq("academic_year", academicYear);
      if (term && term !== "all") query = query.eq("term", term);
      
      // But ALWAYS exclude the current context if provided
      if (currentAY && currentTerm) {
        query = query.or(`academic_year.neq.${currentAY},term.neq.${currentTerm}`);
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
    const submissionCounts = new Map<number, number>();
    if (submissionsData) {
      submissionsData.forEach((submission) => {
        if (submission.activity_id) {
          const count = submissionCounts.get(submission.activity_id) || 0;
          submissionCounts.set(submission.activity_id, count + 1);
        }
      });
    }

    // Map Supabase rows to EssayActivity format
    const mappedActivities: EssayActivity[] = (
      activitiesData as unknown as SupabaseActivityRow[]
    ).map((row) => ({
      id: String(row.id),
      title: row.title,
      courseId:
        Array.isArray(row.course_id) && row.course_id.length > 0
          ? String(row.course_id[0])
          : "all",
      courseIds: Array.isArray(row.course_id) ? row.course_id.map(String) : [],
      blockId:
        Array.isArray(row.block_id) && row.block_id.length > 0
          ? String(row.block_id[0])
          : "all",
      blockIds: Array.isArray(row.block_id) ? row.block_id.map(String) : [],
      rubricId: row.rubric_id ? String(row.rubric_id) : null,
      term: row.term || undefined,
      description: row.instructions || undefined,
      minWordCount: row.min_word_count || 150,
      createdAt: row.created_at.split("T")[0], // Extract date part
      submissionCount: submissionCounts.get(row.id) || 0,
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
    const { platformRubrics } = await import("../data/rubricData");

    // Get all existing platform rubrics from database
    // Fetch all rubrics and filter in JavaScript to avoid 406 error
    const { data: allRubrics, error: fetchError } = await supabase
      .from("rubrics")
      .select("id, name, user_id");

    if (fetchError) {
      console.error("Error fetching existing rubrics:", fetchError);
      // If we can't fetch, we can't check what exists, so skip initialization
      return 0;
    }

    const existingNames = new Set(
      (allRubrics || [])
        .filter((r) => r.user_id === null)
        .map((r) => r.name.toLowerCase()),
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
  templateId: number,
): Promise<number | null> => {
    try {
    // Import template to get the name
    const { platformRubrics } = await import("../data/rubricData");
    const template = platformRubrics.find((r) => r.id === templateId);

    if (!template) {
      console.warn(`Template rubric with ID ${templateId} not found`);
      return null;
    }

    // Find platform rubric by name (since database IDs differ from template IDs)
    // Fetch all rubrics with this name and filter in JavaScript
    const { data: rubricsWithName } = await supabase
      .from("rubrics")
      .select("id, user_id")
      .eq("name", template.name);

    // Find the one that's a platform rubric (user_id is null)
    const existing = rubricsWithName?.find((r) => r.user_id === null);

    if (existing) {
      return existing.id;
    }

    // If not found, create it (shouldn't happen if initializePlatformRubrics ran, but just in case)
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
      console.error("Error creating platform rubric:", error);
      return null;
    }

    console.log(
      `Created platform rubric "${template.name}" with database ID ${newRubric.id}`,
    );
    return newRubric.id;
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
    const teacherId = await fetchTeacherUUID();
    if (!teacherId) {
      throw new Error("Teacher UUID not available");
    }

    // For now, store first selected course/section or null if empty (meaning "all")

    // Handle rubric ID - ensure platform rubrics exist in database
    let rubricId: number | null = null;
    if (activity.rubricId) {
      if (activity.rubricId.startsWith("platform-")) {
        // Template rubric - ensure it exists in database, then use its ID
        const numericId = activity.rubricId.replace("platform-", "");
        const templateId = parseInt(numericId, 10);
        if (!isNaN(templateId)) {
          rubricId = await ensurePlatformRubricExists(templateId);
        }
      } else {
        // Platform rubric from database - use ID directly
        rubricId = parseInt(activity.rubricId, 10) || null;
      }
    }

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
        blocksData.forEach((b: any) => {
          const tpl = Array.isArray(b.teacher_program_loads)
            ? b.teacher_program_loads[0]
            : b.teacher_program_loads;

          blockToProgram.set(String(b.id), tpl?.program_id || null);
        });
      }

      // 2. Fetch all student user IDs for notifications, grouped by block
      const { data: studentsData, error: studentError } = await supabase
        .from("block_students")
        .select(
          `
          block_id,
          students (
            auth_user_id
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
        studentsData.forEach((row: any) => {
          const authId = row.students?.auth_user_id;
          if (authId && row.block_id) {
            if (!studentIdsByBlock.has(String(row.block_id))) {
              studentIdsByBlock.set(String(row.block_id), []);
            }
            studentIdsByBlock.get(String(row.block_id))?.push(authId);
          }
        });
      }
    }

    // 3. Create a single activity record with array columns
    const activityToInsert = {
      teacher_id: teacherId,
      title: activity.title.trim(),
      course_id: activity.courseIds, // Now assigned as array
      block_id: activity.sectionIds, // Now assigned as array
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
      const notificationsToInsert: any[] = [];

      activity.sectionIds.forEach((blockId) => {
        const targetStudentIds = studentIdsByBlock.get(String(blockId)) || [];

        targetStudentIds.forEach((studentUserId) => {
          notificationsToInsert.push({
            user_id: studentUserId,
            type: "new_activity",
            title: "New Activity Assigned",
            message: `A new activity "${activity.title.trim()}" has been posted.`,
            related_id: String(newActivity.id),
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
      courseId:
        Array.isArray(row.course_id) && row.course_id.length > 0
          ? String(row.course_id[0])
          : "all",
      courseIds: Array.isArray(row.course_id) ? row.course_id.map(String) : [],
      blockId:
        Array.isArray(row.block_id) && row.block_id.length > 0
          ? String(row.block_id[0])
          : "all",
      blockIds: Array.isArray(row.block_id) ? row.block_id.map(String) : [],
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

    const id = parseInt(activityId, 10);
    if (isNaN(id)) {
      throw new Error("Invalid activity ID");
    }

    // Get first selected program/section or null

    // Handle rubric ID - ensure platform rubrics exist in database
    let rubricId: number | null = null;
    if (activityData.rubricId) {
      if (activityData.rubricId.startsWith("platform-")) {
        // Template rubric - ensure it exists in database, then use its ID
        const numericId = activityData.rubricId.replace("platform-", "");
        const templateId = parseInt(numericId, 10);
        if (!isNaN(templateId)) {
          rubricId = await ensurePlatformRubricExists(templateId);
        }
      } else {
        // Platform rubric from database - use ID directly
        rubricId = parseInt(activityData.rubricId, 10) || null;
      }
    }

    const updateData: Record<string, unknown> = {
      title: activityData.title,
      course_id: activityData.courseIds,
      block_id: activityData.sectionIds,
      rubric_id: rubricId && !isNaN(rubricId) ? rubricId : null,
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
        blocksData.forEach((b: any) => {
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
      courseId:
        Array.isArray(row.course_id) && row.course_id.length > 0
          ? String(row.course_id[0])
          : "all",
      courseIds: Array.isArray(row.course_id) ? row.course_id.map(String) : [],
      blockId:
        Array.isArray(row.block_id) && row.block_id.length > 0
          ? String(row.block_id[0])
          : "all",
      blockIds: Array.isArray(row.block_id) ? row.block_id.map(String) : [],
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
    const id = parseInt(activityId, 10);
    if (isNaN(id)) {
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
export const fetchCourses = async (): Promise<
  { id: string; course_code: string; course_title: string }[]
> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return [];

    // Fetch courses through teacher_course_loads
    const { data, error } = await supabase
      .from("teacher_course_loads")
      .select("courses(id, course_code, course_title)")
      .eq("teacher_id", userData.user.id);

    if (error) {
      console.error("Error loading teacher courses:", error);
      return [];
    }

    const courses = (data || [])
      .map((l: { courses: any }) => l.courses)
      .filter((c) => c !== null);

    // Remove duplicates
    const uniqueCourses = Array.from(
      new Map(courses.map((c) => [c.id, c])).values(),
    );

    return uniqueCourses.sort((a, b) =>
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
): Promise<
  { id: string; program_id: string; program_name: string; course_id: string }[]
> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return [];

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
      .eq("teacher_course_loads.teacher_id", userData.user.id);

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
        id: any;
        program_id: any;
        programs_lookup: any;
        teacher_course_loads: any;
      }) => ({
        id: String(row.id),
        program_id: String(row.program_id),
        program_name:
          row.programs_lookup?.abbr ||
          row.programs_lookup?.name ||
          "Unknown Program",
        course_id: String(row.teacher_course_loads?.course_id || ""),
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
): Promise<
  { id: string; name: string; courseId: string; programLoadId: string }[]
> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return [];

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
      .eq("teacher_id", userData.user.id);

    if (programLoadId && programLoadId !== "all") {
      query = query.eq("program_load_id", programLoadId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading sections:", error);
      return [];
    }

    return (data || []).map((block: any) => {
      const progAbbr =
        block.teacher_program_loads?.programs_lookup?.abbr ||
        block.teacher_program_loads?.programs_lookup?.name ||
        "";
      const yearStr = block.year ? `${block.year}` : "";
      const fullName = [progAbbr, yearStr + block.name]
        .filter(Boolean)
        .join(" ");

      return {
        id: String(block.id),
        name: fullName,
        programLoadId: String(block.program_load_id),
        courseId: String(
          block.teacher_program_loads?.teacher_course_loads?.course_id || "",
        ),
      };
    });
  } catch (err) {
    console.error("Unexpected error loading sections:", err);
    return [];
  }
};

// Load rubrics for dropdown, separated by platform and teacher rubrics
export const fetchRubrics = async (): Promise<{
  platform: { id: string; name: string }[];
  teacher: { id: string; name: string }[];
}> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      return { platform: [], teacher: [] };
    }

    // First, ensure all platform rubrics are synced to database
    await initializePlatformRubrics();

    // Fetch platform rubrics from database (user_id is null - system/platform rubrics)
    // Note: We fetch all rubrics and filter in JavaScript to avoid 406 error with .is() filter
    const { data: allRubricsData, error: allRubricsError } = await supabase
      .from("rubrics")
      .select("id, name, user_id")
      .order("name", { ascending: true });

    // Filter platform rubrics (user_id is null) in JavaScript
    const platformData =
      allRubricsData?.filter((r) => r.user_id === null) || [];
    const platformError = allRubricsError;

    // Fetch teacher rubrics from database
    const { data: teacherData, error: teacherError } = await supabase
      .from("rubrics")
      .select("id, name")
      .eq("user_id", teacherId)
      .order("name", { ascending: true });

    if (platformError) {
      console.error("Error loading platform rubrics:", platformError);
    }
    if (teacherError) {
      console.error("Error loading teacher rubrics:", teacherError);
    }

    // If no platform rubrics in database, initialize them from templates
    let platformRubricsList: { id: string; name: string }[] = [];
    if (!platformData || platformData.length === 0) {
      // Initialize all platform rubrics to database
      console.log("No platform rubrics found in database, initializing...");
      await initializePlatformRubrics();

      // Fetch again after initialization
      const { data: refreshedAllRubrics } = await supabase
        .from("rubrics")
        .select("id, name, user_id")
        .order("name", { ascending: true });

      const refreshedPlatform = (refreshedAllRubrics || []).filter(
        (r) => r.user_id === null,
      );

      if (refreshedPlatform.length > 0) {
        // Use platform rubrics from database
        platformRubricsList = refreshedPlatform.map((r) => ({
          id: String(r.id),
          name: r.name,
        }));
      } else {
        // Fallback to hardcoded templates if initialization failed
        try {
          const { platformRubrics } = await import("../data/rubricData");
          platformRubricsList = (platformRubrics || []).map((r) => ({
            id: `platform-${r.id}`, // Prefix to distinguish from database IDs
            name: r.name,
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
      }));
    }

    return {
      platform: platformRubricsList.sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      teacher: (teacherData || []).map((r) => ({
        id: String(r.id),
        name: r.name,
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
  }[]
> => {
  try {
    // Fetch students for this block (blocks replaced sections)
    // Query through block_students junction table
    const { data: blockStudentsData, error: blockStudentsError } =
      await supabase
        .from("block_students")
        .select(
          "student_id, students!inner(id, student_code, first_name, middle_name, last_name)",
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
      student_id: number;
      students: {
        id: number;
        student_code: string;
        first_name: string;
        middle_name: string | null;
        last_name: string;
      };
    };
    const studentsData = (
      blockStudentsData as unknown as BlockStudentRow[]
    ).map((bs) => bs.students);

    // Sort by full name in memory
    studentsData.sort((a, b) => {
      const nameA = buildFullNameFromObject(a, a.student_code).toLowerCase();
      const nameB = buildFullNameFromObject(b, b.student_code).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // If activityId is provided, fetch essay submissions for this activity
    const essaySubmissions = new Map<
      number,
      {
        grammar?: number;
        score?: number;
        wordCount?: number;
        gradingError?: string;
        coherence?: number;
        readability?: number;
        argumentative?: number;
      }
    >();

    if (activityId) {
      const activityDbId = parseInt(activityId, 10);
      if (!isNaN(activityDbId)) {
        const studentIds = studentsData.map((s) => s.id);
        const { data: essaysData, error: essaysError } = await supabase
          .from("essays")
          .select(
            "student_id, coherence_score, readability_score, argument_strength_score, grammar_score, overall_score, word_count, grading_error",
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

    // Parse student ID (it might be a string ID or numeric DB ID)
    let studentDbId = parseInt(studentId, 10);
    if (isNaN(studentDbId)) {
      // If studentId is a student_code, fetch the actual DB ID
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("student_code", studentId)
        .single();

      if (studentError || !studentData) {
        return { success: false, error: "Student not found" };
      }
      studentDbId = studentData.id;
    }

    // Parse activity ID
    const activityDbId = parseInt(activityId, 10);
    if (isNaN(activityDbId)) {
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

    // Parse student ID
    let studentDbId = parseInt(studentId, 10);
    if (isNaN(studentDbId)) {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("student_code", studentId)
        .single();

      if (studentError || !studentData) {
        return { success: false, error: "Student not found" };
      }
      studentDbId = studentData.id;
    }

    // Parse activity ID
    const activityDbId = parseInt(activityId, 10);
    if (isNaN(activityDbId)) {
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
    // Parse student ID
    let studentDbId = parseInt(studentId, 10);
    if (isNaN(studentDbId)) {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("student_code", studentId)
        .single();

      if (studentError || !studentData) {
        return { success: false, error: "Student not found" };
      }
      studentDbId = studentData.id;
    }

    // Parse activity ID
    const activityDbId = parseInt(activityId, 10);
    if (isNaN(activityDbId)) {
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
    // Count students for this block
    const { count: studentCount, error: studentsCountError } = await supabase
      .from("block_students")
      .select("*", { count: "exact", head: true })
      .eq("block_id", sectionId);

    if (studentsCountError) {
      console.error("Error counting students:", studentsCountError);
    }

    // Parse activity ID
    const activityDbId = parseInt(activityId, 10);
    if (isNaN(activityDbId)) {
      return { studentCount: studentCount || 0, submissionCount: 0 };
    }

    // Count submissions for this activity and section
    const { count: submissionCount, error: submissionsCountError } =
      await supabase
        .from("essays")
        .select("*", { count: "exact", head: true })
        .eq("activity_id", activityDbId)
        .eq("block_id", sectionId);

    if (submissionsCountError) {
      console.error("Error counting submissions:", submissionsCountError);
    }

    return {
      studentCount: studentCount || 0,
      submissionCount: submissionCount || 0,
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
): Promise<{ fileUrl: string; title: string; fileType: string } | null> => {
  try {
    // Parse student ID
    let studentDbId = parseInt(studentId, 10);
    if (isNaN(studentDbId)) {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("student_code", studentId)
        .single();

      if (studentError || !studentData) {
        console.error("Error finding student:", studentError);
        return null;
      }
      studentDbId = studentData.id;
    }

    // Parse activity ID
    const activityDbId = parseInt(activityId, 10);
    if (isNaN(activityDbId)) {
      console.error("Invalid activity ID");
      return null;
    }

    // Fetch essay record
    const { data: essayData, error: essayError } = await supabase
      .from("essays")
      .select("file_path, title")
      .eq("student_id", studentDbId)
      .eq("activity_id", activityDbId)
      .single();

    if (essayError || !essayData) {
      console.error("Error fetching essay:", essayError);
      return null;
    }

    // Get signed URL from Supabase Storage (bucket is private)
    // Signed URLs are valid for 1 hour (3600 seconds)
    const { data: urlData, error: urlError } = await supabase.storage
      .from("essays")
      .createSignedUrl(essayData.file_path, 3600);

    if (urlError || !urlData?.signedUrl) {
      console.error("Error getting file URL:", urlError);
      return null;
    }

    // Determine file type from file path
    const fileExt = essayData.file_path.split(".").pop()?.toLowerCase() || "";
    const isPdf = fileExt === "pdf";
    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt);

    return {
      fileUrl: urlData.signedUrl,
      title: essayData.title || "Essay Submission",
      fileType: isPdf ? "pdf" : isImage ? "image" : "unknown",
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
    let studentDbId = parseInt(studentId, 10);
    if (isNaN(studentDbId)) {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("student_code", studentId)
        .single();

      if (studentError || !studentData) {
        return false;
      }
      studentDbId = studentData.id;
    }

    // Parse activity ID
    const activityDbId = parseInt(activityId, 10);
    if (isNaN(activityDbId)) {
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
    let studentDbId = parseInt(studentId, 10);
    let authUserId: string | null = null;

    if (isNaN(studentDbId)) {
      const { data: studentData } = await supabase
        .from("students")
        .select("id, auth_user_id")
        .eq("student_code", studentId)
        .single();
      authUserId = studentData?.auth_user_id || null;
      studentDbId = studentData?.id || 0;
    } else {
      const { data: studentData } = await supabase
        .from("students")
        .select("id, auth_user_id")
        .eq("id", studentDbId)
        .single();
      authUserId = studentData?.auth_user_id || null;
      studentDbId = studentData?.id || 0;
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
      .eq("activity_id", parseInt(activityId, 10))
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
    let studentDbId = parseInt(studentId, 10);
    let authUserId: string | null = null;
    
    if (isNaN(studentDbId)) {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, auth_user_id")
        .eq("student_code", studentId)
        .single();

      if (studentError || !studentData) {
        return { success: false, error: "Student not found" };
      }
      studentDbId = studentData.id;
      authUserId = studentData.auth_user_id;
    } else {
      const { data: stdData } = await supabase
        .from("students")
        .select("auth_user_id")
        .eq("id", studentDbId)
        .single();
        
      if (stdData) {
        authUserId = stdData.auth_user_id;
      }
    }

    // Parse activity ID
    const activityDbId = parseInt(activityId, 10);
    if (isNaN(activityDbId)) {
      return { success: false, error: "Invalid activity ID" };
    }

    const { data: essayData, error: essayError } = await supabase
      .from("essays")
      .select("id, file_path, title, essay_activities(id, title, min_word_count)")
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

    // Step 1: OCR - Extract text from PDF (automatic, no confirmation needed)
    // Since all students submit PDFs, we always use OCR to extract text
    const { ocrApi } = await import("../api");
    let extractedText: string;
    try {
      const ocrResult = await ocrApi.extractTextFromFile(file);
      extractedText = ocrResult.text;

      const wordCount = extractedText
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length;

      const essay_activities = essayData.essay_activities;
      const minWordCount = (Array.isArray(essay_activities) 
        ? essay_activities[0]?.min_word_count 
        : (essay_activities as any)?.min_word_count) || 150;

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

      onProgress?.(40, `Text extracted (${wordCount} words). Analyzing...`);
    } catch (ocrErr) {
      console.error("OCR error:", ocrErr);
      return {
        success: false,
        error:
          ocrErr instanceof Error
            ? ocrErr.message
            : "Failed to extract text from PDF",
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
          .eq("id", parseInt(rubricId, 10))
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
        user_id: teacherId,
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
      const activityTitle = (essayData.essay_activities as any)?.title || "Essay";
      
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
      error: err instanceof Error ? err.message : "Unknown error occurred",
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
} | null> => {
  try {
    // Parse student ID
    let studentDbId = parseInt(studentId, 10);
    if (isNaN(studentDbId)) {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("student_code", studentId)
        .single();

      if (studentError || !studentData) {
        return null;
      }
      studentDbId = studentData.id;
    }

    // Parse activity ID
    const activityDbId = parseInt(activityId, 10);
    if (isNaN(activityDbId)) {
      return null;
    }

    // First, get the essay ID
    const { data: essayData, error: essayError } = await supabase
      .from("essays")
      .select("id, title")
      .eq("student_id", studentDbId)
      .eq("activity_id", activityDbId)
      .single();

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
        .single();

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
      // Fallback: try to get from essays.analysis_payload (for backwards compatibility)
      const { data: fallbackEssay, error: fallbackError } = await supabase
        .from("essays")
        .select("id, title, file_path, analysis_payload")
        .eq("id", essayData.id)
        .single();

      if (fallbackError || !fallbackEssay || !fallbackEssay.analysis_payload) {
        return null;
      }

      // Get text from file if available
      let text = "";
      if (fallbackEssay.file_path) {
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
      };
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
      // detailed_analysis contains ALL interactive data:
      // - grammar.errors[] with offset, errorLength, context, message, suggestion
      // - readability with flesch_reading_ease, flesch_kincaid_grade, issues[]
      // - argumentation with claims, evidence, warrants, rebuttals, graph
      // - knowledge_graph with concepts, relationships, graph_structure
      // - coherence with topic_sentences, transitional_elements, coherence_issues
      detailed_analysis: analysisData.detailed_analysis || {},
      recommendations: analysisData.recommendations || [],
      diagnostic_summary: analysisData.diagnostic_summary || undefined,
      word_count: analysisData.word_count || undefined,
      generated_at: analysisData.generated_at || new Date().toISOString(),
    };

    // Add rubric_scores if present (for TextAnalysisResponse compatibility)
    if (analysisData.rubric_scores) {
      (
        analysis as import("../types/Essay").TextAnalysisResponse
      ).rubric_scores = analysisData.rubric_scores;
      console.log(
        "[fetchEssayAnalysis] Found rubric_scores:",
        analysisData.rubric_scores,
      );
    } else {
      console.log(
        "[fetchEssayAnalysis] No rubric_scores in analysis data. Analysis data keys:",
        Object.keys(analysisData),
      );
      // If rubric_scores is missing but we have a rubric_id, try to fetch it from the activity
      if (analysisData.activity_id) {
        const { data: activity } = await supabase
          .from("essay_activities")
          .select("rubric_id")
          .eq("id", analysisData.activity_id)
          .single();

        if (activity?.rubric_id) {
          console.log(
            "[fetchEssayAnalysis] Activity has rubric_id but analysis missing rubric_scores. Rubric ID:",
            activity.rubric_id,
          );
        }
      }
    }

    return {
      analysis: analysis,
      // original_text is CRITICAL - needed for displaying essay with grammar error highlights
      // The offset/errorLength in grammar.errors reference positions in this text
      text: analysisData.original_text || "",
      title: essayData.title || "Essay Analysis",
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
    let studentDbId = parseInt(studentId, 10);
    if (isNaN(studentDbId)) {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("student_code", studentId)
        .single();

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
    essayId: number;
    studentId: number;
    studentName: string;
    programName: string;
    sectionName: string;
    title: string;
    submittedAt: string;
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
    essay_id?: number;
    original_text?: string | null;
    content?: string | null;
    essays?: unknown;
    id?: number;
  }>,
  textField: "original_text" | "content",
): DuplicateEssayGroup[] => {
  // Get all texts
  const essayTexts = new Map<number, string>();
  for (const item of sourceData) {
    const text =
      textField === "original_text" ? item.original_text : item.content;
    let essayId: number | undefined;

    if (textField === "original_text") {
      // For original_text, extract essay ID from nested structure
      // Supabase returns essays as an object (not array) when using !inner
      const essaysData = item.essays as { id?: number } | undefined;
      essayId = essaysData?.id || item.essay_id;
    } else {
      essayId = item.id;
    }

    if (text && essayId) {
      essayTexts.set(essayId, text);
    }
  }

  const duplicateGroups: DuplicateEssayGroup[] = [];
  // Lower threshold to catch essays with headers/formatting differences
  // 60% is reasonable for detecting same content with different headers
  const SIMILARITY_THRESHOLD = 0.6;

  // Collect all essays from all hash groups for cross-group comparison
  const allEssays: Array<{ essayId: number; hash: string }> = [];
  for (const [hash, essays] of groups.entries()) {
    for (const essay of essays) {
      allEssays.push({ essayId: essay.essayId, hash });
    }
  }

  // Group essays by similarity (compare across hash groups too)
  const similarityGroups: Array<DuplicateEssayGroup["essays"]> = [];
  const processedEssays = new Set<number>();

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

  return duplicateGroups;
};

// Detect duplicate essays across different programs for an activity
export const fetchDuplicateEssays = async (
  activityId: string,
): Promise<DuplicateEssayGroup[]> => {
  try {
    const activityDbId = parseInt(activityId, 10);
    if (isNaN(activityDbId)) {
      return [];
    }

    // Fetch all essays for this activity with their analysis results
    const { data: analysisResults, error } = await supabase
      .from("essay_analysis_results")
      .select(
        `
        essay_id,
        student_id,
        original_text,
        essays!essays_id_fkey(
          id,
          title,
          submitted_at,
          block_id,
          students!essays_student_id_fkey(
            id,
            first_name,
            middle_name,
            last_name
          ),
          blocks!essays_block_id_fkey(
            id,
            name,
            year,
            teacher_program_loads!fk_block_program_load!inner(
              programs_lookup!inner(
                id,
                name,
                abbr
              )
            )
          )
        )
      `,
      )
      .eq("activity_id", activityDbId);

    if (error) {
      console.error(
        "[fetchDuplicateEssays] Error fetching analysis results:",
        error,
      );
    }

    if (!analysisResults || analysisResults.length === 0) {
      console.log(
        `[fetchDuplicateEssays] No analysis results found. Trying fallback to essays table...`,
      );
      // Try fallback: fetch from essays table if essay_analysis_results doesn't exist
      const { data: essaysData, error: essaysError } = await supabase
        .from("essays")
        .select(
          `
          id,
          title,
          submitted_at,
          content,
          block_id,
          students!essays_student_id_fkey(
            id,
            first_name,
            middle_name,
            last_name
          ),
          blocks!essays_block_id_fkey(
            id,
            name,
            year,
            teacher_program_loads!fk_block_program_load!inner(
              programs_lookup!inner(
                id,
                name,
                abbr
              )
            )
          )
        `,
        )
        .eq("activity_id", activityDbId);

      if (essaysError) {
        console.error(
          "[fetchDuplicateEssays] Error fetching essays:",
          essaysError,
        );
      }

      if (!essaysData || essaysData.length === 0) {
        console.log(
          `[fetchDuplicateEssays] No essays found for activity ${activityDbId}`,
        );
        return [];
      }

      console.log(
        `[fetchDuplicateEssays] Found ${essaysData.length} essays (fallback). Attempting to use content field...`,
      );

      // Try to use essays.content if available
      type EssayWithNested = {
        id: number;
        title: string;
        submitted_at: string;
        content?: string | null;
        block_id?: string | null;
        students?: {
          id: number;
          first_name: string;
          middle_name: string | null;
          last_name: string;
        };
        blocks?: {
          id: string;
          name: string;
          year?: number | null;
          teacher_program_loads?: {
            programs_lookup?: {
              id: string;
              name: string;
              abbr: string | null;
            };
          };
        };
      };

      const essaysWithContent = (
        essaysData as unknown as EssayWithNested[]
      ).filter((e) => e.content && e.content.trim().length >= 50);

      if (essaysWithContent.length < 2) {
        console.log(
          `[fetchDuplicateEssays] Not enough essays with content for comparison (need at least 2, found ${essaysWithContent.length})`,
        );
        return [];
      }

      // Process essays with content field
      const contentGroups = new Map<string, DuplicateEssayGroup["essays"]>();

      for (const essay of essaysWithContent) {
        const essayText = essay.content;
        if (!essayText || essayText.trim().length < 50) {
          continue;
        }

        const student = essay.students;
        const block = essay.blocks;
        const program = block?.teacher_program_loads?.programs_lookup;

        if (!student || !block || !program) {
          continue;
        }

        const essayInfo = {
          essayId: essay.id,
          studentId: student.id,
          studentName: buildFullNameFromObject(student, "Unknown"),
          programName: program.abbr || program.name || "Unknown",
          sectionName: block.year
            ? `${block.year}${block.name}`
            : block.name || "Unknown",
          title: essay.title || "Untitled",
          submittedAt: essay.submitted_at || new Date().toISOString(),
        };

        const contentHash = generateContentHash(essayText);
        if (!contentGroups.has(contentHash)) {
          contentGroups.set(contentHash, []);
        }
        contentGroups.get(contentHash)!.push(essayInfo);
      }

      // Continue with similarity matching
      return processSimilarityGroups(
        contentGroups,
        essaysWithContent.map((e) => ({
          id: e.id,
          content: e.content || null,
        })),
        "content",
      );
    }

    // Group essays by content hash
    const contentGroups = new Map<string, DuplicateEssayGroup["essays"]>();

    for (const result of analysisResults) {
      const originalText = result.original_text;
      if (!originalText || originalText.trim().length < 50) {
        continue; // Skip essays without text or too short
      }

      // Supabase returns nested data - handle the structure
      type EssayDataStructure = {
        id: number;
        title: string;
        submitted_at: string;
        block_id?: string | null;
        students?: {
          id: number;
          first_name: string;
          middle_name: string | null;
          last_name: string;
        };
        blocks?: {
          id: string;
          name: string;
          year?: number | null;
          teacher_program_loads?: {
            programs_lookup?: {
              id: string;
              name: string;
              abbr: string | null;
            };
          };
        };
      };

      // Handle different possible structures from Supabase
      // Supabase returns nested data as an object (not array) when using !inner
      const essaysData = result.essays as unknown;
      let essayData: EssayDataStructure | null = null;

      if (Array.isArray(essaysData)) {
        essayData = essaysData[0] as unknown as EssayDataStructure;
      } else {
        essayData = essaysData as unknown as EssayDataStructure;
      }

      if (!essayData) {
        continue;
      }

      // Type guard to ensure essayData is not null
      const student = essayData.students;
      const block = essayData.blocks;
      const program = block?.teacher_program_loads?.programs_lookup;

      if (!student || !block || !program) {
        continue;
      }

      const essayInfo = {
        essayId: essayData.id,
        studentId: student.id,
        studentName: buildFullNameFromObject(student, "Unknown"),
        programName: program.abbr || program.name || "Unknown",
        sectionName: block.year
          ? `${block.year}${block.name}`
          : block.name || "Unknown",
        title: essayData.title || "Untitled",
        submittedAt: essayData.submitted_at || new Date().toISOString(),
      };

      const contentHash = generateContentHash(originalText);

      if (!contentGroups.has(contentHash)) {
        contentGroups.set(contentHash, []);
      }
      contentGroups.get(contentHash)!.push(essayInfo);
    }

    // Use the helper function to process similarity groups
    const duplicateGroups = processSimilarityGroups(
      contentGroups,
      analysisResults.map((r) => ({
        essay_id: r.essay_id,
        original_text: r.original_text,
        essays: r.essays,
      })),
      "original_text",
    );

    return duplicateGroups;
  } catch (err) {
    console.error("Error fetching duplicate essays:", err);
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

export interface ComparisonAnalysis {
  id?: number;
  activityId: string;
  studentIds: number[];
  essayIds: number[];
  insights: string;
  highlights: ComparisonHighlight[];
  similarityScore?: number;
  createdAt?: string;
}

// Fetch all students who submitted essays for an activity
export const fetchStudentsForActivity = async (
  activityId: string,
): Promise<
  Array<{
    id: string;
    studentId: number;
    essayId: number;
    name: string;
    programName: string;
    sectionName: string;
    hasEssay: boolean;
  }>
> => {
  try {
    const activityDbId = parseInt(activityId, 10);
    if (isNaN(activityDbId)) {
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
        students!essays_student_id_fkey(
          id,
          first_name,
          middle_name,
          last_name
        ),
        blocks!essays_block_id_fkey(
          id,
          name,
          program_id,
          programs_lookup!inner(
            id,
            name
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
      id: number;
      student_id: number;
      block_id: number | null;
      students: {
        id: number;
        first_name: string;
        middle_name: string | null;
        last_name: string;
      };
      blocks: {
        id: number;
        name: string;
        program_id: string | null;
        programs_lookup: {
          id: string;
          name: string;
        };
      };
    };

    return (essaysData as unknown as EssayWithStudentData[]).map((essay) => {
      const student = essay.students;
      const block = essay.blocks;
      const program = block?.programs_lookup;

      return {
        id: String(student.id),
        studentId: student.id,
        essayId: essay.id,
        name: buildFullNameFromObject(student, "Unknown"),
        programName: program?.name || "Unknown",
        sectionName: block?.name || "Unknown",
        hasEssay: true,
      };
    });
  } catch (err) {
    console.error("Error fetching students for activity:", err);
    return [];
  }
};

// Fetch essay texts for multiple students at once (for comparison)
export const fetchEssayTextsForStudents = async (
  studentIds: number[],
  activityId: string,
): Promise<
  Array<{
    studentId: number;
    text: string;
    essayId: number;
    studentName: string;
  }>
> => {
  try {
    const activityDbId = parseInt(activityId, 10);
    if (isNaN(activityDbId) || studentIds.length === 0) {
      return [];
    }

    // Fetch essays for these students
    const { data: essaysData, error: essaysError } = await supabase
      .from("essays")
      .select(
        "id, student_id, students!essays_student_id_fkey(id, first_name, middle_name, last_name)",
      )
      .eq("activity_id", activityDbId)
      .in("student_id", studentIds);

    if (essaysError || !essaysData || essaysData.length === 0) {
      return [];
    }

    // Type definitions for Supabase query results
    type EssayWithStudent = {
      id: number;
      student_id: number;
      students: {
        id: number;
        first_name: string;
        middle_name: string | null;
        last_name: string;
      };
    };

    type AnalysisDataItem = {
      essay_id: number;
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
    const textMap = new Map<number, string>();
    if (analysisData) {
      (analysisData as unknown as AnalysisDataItem[]).forEach((item) => {
        if (item.original_text) {
          textMap.set(item.essay_id, item.original_text);
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
          studentId: essay.student_id,
          text: textMap.get(essay.id) || "",
          essayId: essay.id,
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
): Promise<{ text: string; essayId: number } | null> => {
  try {
    const studentDbId = parseInt(studentId, 10);
    const activityDbId = parseInt(activityId, 10);

    if (isNaN(studentDbId) || isNaN(activityDbId)) {
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
): Promise<{ success: boolean; id?: number; error?: string }> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher ID not available" };
    }

    const activityDbId = parseInt(comparison.activityId, 10);
    if (isNaN(activityDbId)) {
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

    const activityDbId = parseInt(activityId, 10);
    if (isNaN(activityDbId)) {
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
      id: number;
      activity_id: number;
      user_id: number;
      student_ids: number[];
      essay_ids: number[];
      insights: string;
      similarity_highlights: ComparisonHighlight[];
      similarity_score: number | null;
      created_at: string;
      updated_at: string;
    };

    return data.map((row: EssayComparisonRow) => ({
      id: row.id,
      activityId: String(row.activity_id),
      studentIds: row.student_ids || [],
      essayIds: row.essay_ids || [],
      insights: row.insights || "",
      highlights: row.similarity_highlights || [],
      similarityScore: row.similarity_score ?? undefined,
      createdAt: row.created_at,
    }));
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
          students!essays_student_id_fkey(
            id,
            first_name,
            middle_name,
            last_name
          ),
          blocks!essays_block_id_fkey(
            id,
            name,
            program_id,
            programs_lookup!inner(
              id,
              name
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
  studentIdOrEssayId: string | number,
  activityIdOrResult:
    | string
    | import("../api").PlagiarismCheckResponse
    | undefined,
  plagiarismResult?: import("../api").PlagiarismCheckResponse,
): Promise<{ success: boolean; error?: string }> => {
  try {
    let essayId: number;
    let result: import("../api").PlagiarismCheckResponse;

    // Determine which overload is being used
    if (typeof activityIdOrResult === "object" && activityIdOrResult !== null) {
      // Called with (essayId, plagiarismResult)
      essayId =
        typeof studentIdOrEssayId === "number"
          ? studentIdOrEssayId
          : parseInt(studentIdOrEssayId, 10);
      result = activityIdOrResult;
    } else if (plagiarismResult) {
      // Called with (studentId, activityId, plagiarismResult)
      const studentId = studentIdOrEssayId as string;
      const activityId = activityIdOrResult as string;

      // Parse student ID
      let studentDbId = parseInt(studentId, 10);
      if (isNaN(studentDbId)) {
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("id")
          .eq("student_code", studentId)
          .single();

        if (studentError || !studentData) {
          return { success: false, error: "Student not found" };
        }
        studentDbId = studentData.id;
      }

      // Parse activity ID
      const activityDbId = parseInt(activityId, 10);
      if (isNaN(activityDbId)) {
        return { success: false, error: "Invalid activity ID" };
      }

      // Get essay ID
      const { data: essayData, error: essayError } = await supabase
        .from("essays")
        .select("id")
        .eq("student_id", studentDbId)
        .eq("activity_id", activityDbId)
        .single();

      if (essayError || !essayData) {
        return { success: false, error: "Essay not found" };
      }

      essayId = essayData.id;
      result = plagiarismResult;
    } else {
      return { success: false, error: "Invalid parameters" };
    }

    if (isNaN(essayId)) {
      return { success: false, error: "Invalid essay ID" };
    }

    // Check if the row exists first
    const { data: existingRow, error: checkError } = await supabase
      .from("essay_analysis_results")
      .select("id")
      .eq("essay_id", essayId)
      .single();

    if (checkError || !existingRow) {
      console.error(
        "Essay analysis results row not found for essay_id:",
        essayId,
        checkError,
      );
      return {
        success: false,
        error: "Analysis results not found. Please run analysis first.",
      };
    }

    // Update essay_analysis_results with plagiarism results
    const { data: updateData, error: updateError } = await supabase
      .from("essay_analysis_results")
      .update({
        plagiarism_results: result,
        updated_at: new Date().toISOString(),
      })
      .eq("essay_id", essayId)
      .select();

    if (updateError) {
      console.error("Error updating plagiarism results:", updateError);
      return {
        success: false,
        error: updateError.message || "Failed to save plagiarism results",
      };
    }

    if (!updateData || updateData.length === 0) {
      console.error(
        "Update succeeded but no rows were updated for essay_id:",
        essayId,
      );
      return {
        success: false,
        error: "Update completed but no rows were affected",
      };
    }

    console.log("Successfully saved plagiarism results for essay_id:", essayId);
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
  studentIdOrEssayId: string | number,
  activityId?: string,
): Promise<import("../api").PlagiarismCheckResponse | null> => {
  try {
    let essayId: number;

    if (activityId !== undefined) {
      // Called with (studentId, activityId)
      const studentId = studentIdOrEssayId as string;

      // Parse student ID
      let studentDbId = parseInt(studentId, 10);
      if (isNaN(studentDbId)) {
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("id")
          .eq("student_code", studentId)
          .single();

        if (studentError || !studentData) {
          return null;
        }
        studentDbId = studentData.id;
      }

      // Parse activity ID
      const activityDbId = parseInt(activityId, 10);
      if (isNaN(activityDbId)) {
        return null;
      }

      // Get essay ID
      const { data: essayData, error: essayError } = await supabase
        .from("essays")
        .select("id")
        .eq("student_id", studentDbId)
        .eq("activity_id", activityDbId)
        .single();

      if (essayError || !essayData) {
        return null;
      }

      essayId = essayData.id;
    } else {
      // Called with (essayId)
      essayId =
        typeof studentIdOrEssayId === "number"
          ? studentIdOrEssayId
          : parseInt(studentIdOrEssayId, 10);

      if (isNaN(essayId)) {
        return null;
      }
    }

    // Fetch plagiarism results from essay_analysis_results
    const { data: analysisData, error: analysisError } = await supabase
      .from("essay_analysis_results")
      .select("plagiarism_results")
      .eq("essay_id", essayId)
      .single();

    if (analysisError || !analysisData?.plagiarism_results) {
      return null;
    }

    return analysisData.plagiarism_results as import("../api").PlagiarismCheckResponse;
  } catch (err) {
    console.error("Error loading plagiarism result:", err);
    return null;
  }
};
