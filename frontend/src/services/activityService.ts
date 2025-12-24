// Activity service for data operations

import { supabase } from "../lib/supabaseClient";
import type { EssayActivity } from "../types/activityTypes";
import { fetchTeacherId } from "./rubricService";

// Supabase row type for essay_activities
type SupabaseActivityRow = {
  id: number;
  teacher_id: number | null;
  title: string;
  program_id: number | null;
  section_id: number | null;
  rubric_id: number | null;
  due_date: string | null;
  instructions: string | null;
  created_at: string;
};

// Load activities for the current teacher
export const fetchTeacherActivities = async (): Promise<EssayActivity[]> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      console.error("Teacher ID not available");
      return [];
    }

    // Fetch activities
    const { data: activitiesData, error: activitiesError } = await supabase
      .from("essay_activities")
      .select(
        "id, title, program_id, section_id, rubric_id, due_date, instructions, created_at"
      )
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

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
      activitiesData as SupabaseActivityRow[]
    ).map((row) => ({
      id: String(row.id),
      title: row.title,
      programId: row.program_id ? String(row.program_id) : "all",
      blockId: row.section_id ? String(row.section_id) : "all",
      rubricId: row.rubric_id ? String(row.rubric_id) : null,
      dueDate: row.due_date || undefined,
      description: row.instructions || undefined,
      createdAt: row.created_at.split("T")[0], // Extract date part
      submissionCount: submissionCounts.get(row.id) || 0,
    }));

    return mappedActivities;
  } catch (err) {
    console.error("Unexpected error loading activities:", err);
    return [];
  }
};

// Create a new activity
export const createActivity = async (activity: {
  title: string;
  programIds: string[]; // Empty array means "all"
  sectionIds: string[]; // Empty array means "all"
  rubricId: string | "";
  dueDate: string;
  description: string;
}): Promise<EssayActivity> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      throw new Error("Teacher ID not available");
    }

    // For now, store first selected program/section or null if empty (meaning "all")
    // TODO: Consider adding program_ids JSONB array field to support multiple programs
    const programId =
      activity.programIds.length === 0
        ? null
        : parseInt(activity.programIds[0], 10) || null;
    const sectionId =
      activity.sectionIds.length === 0
        ? null
        : parseInt(activity.sectionIds[0], 10) || null;
    // Handle rubric ID - platform rubrics have "platform-" prefix and can't be used directly
    // Only teacher-created rubrics from database can be assigned
    let rubricId: number | null = null;
    if (activity.rubricId && !activity.rubricId.startsWith("platform-")) {
      rubricId = parseInt(activity.rubricId, 10) || null;
    } else if (activity.rubricId?.startsWith("platform-")) {
      // Platform rubric selected - this shouldn't happen as they're templates
      // But if it does, we'll skip assigning it
      console.warn(
        "Platform rubric template selected - cannot assign template directly to activity"
      );
      rubricId = null;
    }

    const { data, error } = await supabase
      .from("essay_activities")
      .insert({
        teacher_id: teacherId,
        title: activity.title.trim(),
        program_id: programId,
        section_id: sectionId,
        rubric_id: rubricId,
        due_date: activity.dueDate || null,
        instructions: activity.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating activity:", error);
      throw error;
    }

    // Map back to EssayActivity format
    const row = data as SupabaseActivityRow;
    return {
      id: String(row.id),
      title: row.title,
      programId: row.program_id ? String(row.program_id) : "all",
      blockId: row.section_id ? String(row.section_id) : "all",
      rubricId: row.rubric_id ? String(row.rubric_id) : null,
      dueDate: row.due_date || undefined,
      description: row.instructions || undefined,
      createdAt: row.created_at.split("T")[0],
      submissionCount: 0, // New activity has no submissions yet
    };
  } catch (err) {
    console.error("Unexpected error creating activity:", err);
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

// Load programs for dropdown
export const fetchPrograms = async (): Promise<
  { id: string; name: string }[]
> => {
  try {
    const { data, error } = await supabase
      .from("programs")
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

// Load sections (blocks) for dropdown, optionally filtered by program
export const fetchSections = async (
  programId?: string | "all"
): Promise<{ id: string; name: string; programId: string }[]> => {
  try {
    let query = supabase.from("sections").select("id, name, program_id");

    if (programId && programId !== "all") {
      const pid = parseInt(programId, 10);
      if (!isNaN(pid)) {
        query = query.eq("program_id", pid);
      }
    }

    const { data, error } = await query.order("name", { ascending: true });

    if (error) {
      console.error("Error loading sections:", error);
      return [];
    }

    return (data || []).map((s) => ({
      id: String(s.id),
      name: s.name,
      programId: String(s.program_id),
    }));
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

    // Fetch platform rubrics from database (created_by is null - system/platform rubrics)
    const { data: platformData, error: platformError } = await supabase
      .from("rubrics")
      .select("id, name")
      .is("created_by", null)
      .order("name", { ascending: true });

    // Fetch teacher rubrics from database
    const { data: teacherData, error: teacherError } = await supabase
      .from("rubrics")
      .select("id, name")
      .eq("created_by", teacherId)
      .order("name", { ascending: true });

    if (platformError) {
      console.error("Error loading platform rubrics:", platformError);
    }
    if (teacherError) {
      console.error("Error loading teacher rubrics:", teacherError);
    }

    // If no platform rubrics in database, import hardcoded platform rubrics as templates
    let platformRubricsList: { id: string; name: string }[] = [];
    if (!platformData || platformData.length === 0) {
      try {
        const { platformRubrics } = await import("../data/rubricData");
        platformRubricsList = (platformRubrics || []).map((r) => ({
          id: `platform-${r.id}`, // Prefix to distinguish from database IDs
          name: r.name,
        }));
      } catch (importError) {
        console.error("Error importing platform rubrics:", importError);
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
        a.name.localeCompare(b.name)
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

// Fetch students for a specific program and section, with their submission status for an activity
export const fetchStudentsByProgramAndSection = async (
  programName: string,
  sectionName: string,
  activityId?: string
): Promise<
  {
    id: string;
    name: string;
    status: "submitted" | "not submitted";
    coherence?: number;
    readability?: number;
    argumentative?: number;
    grammar?: number;
    score?: number;
  }[]
> => {
  try {
    // First, get program and section IDs from names
    const { data: programData, error: programError } = await supabase
      .from("programs")
      .select("id")
      .eq("name", programName)
      .single();

    if (programError || !programData) {
      console.error("Error finding program:", programError);
      return [];
    }

    const { data: sectionData, error: sectionError } = await supabase
      .from("sections")
      .select("id")
      .eq("name", sectionName)
      .eq("program_id", programData.id)
      .single();

    if (sectionError || !sectionData) {
      console.error("Error finding section:", sectionError);
      return [];
    }

    // Fetch students for this program and section
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, student_code, full_name")
      .eq("program_id", programData.id)
      .eq("section_id", sectionData.id)
      .order("full_name", { ascending: true });

    if (studentsError) {
      console.error("Error loading students:", studentsError);
      return [];
    }

    if (!studentsData || studentsData.length === 0) {
      return [];
    }

    // If activityId is provided, fetch essay submissions for this activity
    const essaySubmissions = new Map<
      number,
      {
        coherence?: number;
        readability?: number;
        argumentative?: number;
        grammar?: number;
        score?: number;
      }
    >();

    if (activityId) {
      const activityDbId = parseInt(activityId, 10);
      if (!isNaN(activityDbId)) {
        const studentIds = studentsData.map((s) => s.id);
        const { data: essaysData, error: essaysError } = await supabase
          .from("essays")
          .select(
            "student_id, coherence_score, readability_score, argument_strength_score, grammar_score, overall_score"
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
            });
          });
        }
      }
    }

    // Map students to the expected format
    return studentsData.map((student) => {
      const submission = essaySubmissions.get(student.id);
      const hasSubmission = !!submission;

      return {
        id: String(student.id),
        name: student.full_name || student.student_code || "Unknown",
        status: hasSubmission ? "submitted" : "not submitted",
        coherence: submission?.coherence,
        readability: submission?.readability,
        argumentative: submission?.argumentative,
        grammar: submission?.grammar,
        score: submission?.score,
      };
    });
  } catch (err) {
    console.error("Unexpected error loading students:", err);
    return [];
  }
};

// Upload essay file and create essay submission record
export const uploadEssayFile = async (
  file: File,
  studentId: string,
  activityId: string,
  programName: string,
  sectionName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      return { success: false, error: "Teacher ID not available" };
    }

    // Get section ID from program name and section name
    const { data: programData, error: programError } = await supabase
      .from("programs")
      .select("id")
      .eq("name", programName)
      .single();

    if (programError || !programData) {
      return { success: false, error: "Program not found" };
    }

    const { data: sectionData, error: sectionError } = await supabase
      .from("sections")
      .select("id")
      .eq("name", sectionName)
      .eq("program_id", programData.id)
      .single();

    if (sectionError || !sectionData) {
      return { success: false, error: "Section not found" };
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
      teacher_id: teacherId,
      section_id: sectionData.id,
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

// Fetch student count and submission count for a program-section-activity combination
export const fetchProgramSectionCounts = async (
  programName: string,
  sectionName: string,
  activityId: string
): Promise<{ studentCount: number; submissionCount: number }> => {
  try {
    // Get program and section IDs from names
    const { data: programData, error: programError } = await supabase
      .from("programs")
      .select("id")
      .eq("name", programName)
      .single();

    if (programError || !programData) {
      console.error("Error finding program:", programError);
      return { studentCount: 0, submissionCount: 0 };
    }

    const { data: sectionData, error: sectionError } = await supabase
      .from("sections")
      .select("id")
      .eq("name", sectionName)
      .eq("program_id", programData.id)
      .single();

    if (sectionError || !sectionData) {
      console.error("Error finding section:", sectionError);
      return { studentCount: 0, submissionCount: 0 };
    }

    // Count students for this program and section
    const { count: studentCount, error: studentsCountError } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("program_id", programData.id)
      .eq("section_id", sectionData.id)
      .eq("is_active", true);

    if (studentsCountError) {
      console.error("Error counting students:", studentsCountError);
    }

    // Parse activity ID
    const activityDbId = parseInt(activityId, 10);
    if (isNaN(activityDbId)) {
      return { studentCount: studentCount || 0, submissionCount: 0 };
    }

    // Count submissions for this activity, program, and section
    const { count: submissionCount, error: submissionsCountError } =
      await supabase
        .from("essays")
        .select("*", { count: "exact", head: true })
        .eq("activity_id", activityDbId)
        .eq("section_id", sectionData.id);

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
