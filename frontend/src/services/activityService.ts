// Activity service for data operations

import { supabase } from "../lib/supabaseClient";
import type { EssayActivity, NewActivityForm } from "../types/activityTypes";
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

// Update an activity
export const updateActivity = async (
  activityId: string,
  activityData: NewActivityForm
): Promise<EssayActivity> => {
  try {
    const teacherId = await fetchTeacherId();
    if (!teacherId) {
      throw new Error("Teacher ID not available");
    }

    const id = parseInt(activityId, 10);
    if (isNaN(id)) {
      throw new Error("Invalid activity ID");
    }

    // Get first selected program/section or null
    const programId =
      activityData.programIds.length > 0
        ? parseInt(activityData.programIds[0], 10)
        : null;
    const sectionId =
      activityData.sectionIds.length > 0
        ? parseInt(activityData.sectionIds[0], 10)
        : null;
    const rubricId = activityData.rubricId
      ? parseInt(activityData.rubricId, 10)
      : null;

    const updateData: {
      title: string;
      program_id: number | null;
      section_id: number | null;
      rubric_id: number | null;
      due_date: string | null;
      instructions: string | null;
    } = {
      title: activityData.title,
      program_id: programId && !isNaN(programId) ? programId : null,
      section_id: sectionId && !isNaN(sectionId) ? sectionId : null,
      rubric_id: rubricId && !isNaN(rubricId) ? rubricId : null,
      due_date: activityData.dueDate || null,
      instructions: activityData.description || null,
    };

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
      submissionCount: 0, // Will be updated when activities are reloaded
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
    // Trim whitespace from names
    const trimmedProgramName = programName.trim();
    const trimmedSectionName = sectionName.trim();

    // First, get program and section IDs from names
    // Try exact match first
    let { data: programData, error: programError } = await supabase
      .from("programs")
      .select("id, name")
      .eq("name", trimmedProgramName)
      .single();

    // If exact match fails, try case-insensitive
    if (programError || !programData) {
      const { data: programsData } = await supabase
        .from("programs")
        .select("id, name")
        .ilike("name", trimmedProgramName);

      if (programsData && programsData.length > 0) {
        programData = programsData[0];
        programError = null;
      }
    }

    if (programError || !programData) {
      console.error(
        `[fetchStudentsByProgramAndSection] Error finding program "${trimmedProgramName}":`,
        programError
      );
      return [];
    }

    // Try exact match first for section
    // Note: Sections can have the same name for different terms, so we might get multiple results
    let { data: sectionsData, error: sectionError } = await supabase
      .from("sections")
      .select("id, name, term")
      .eq("name", trimmedSectionName)
      .eq("program_id", programData.id);

    // If exact match fails, try case-insensitive
    if (sectionError || !sectionsData || sectionsData.length === 0) {
      const { data: sectionsDataCaseInsensitive } = await supabase
        .from("sections")
        .select("id, name, term")
        .ilike("name", trimmedSectionName)
        .eq("program_id", programData.id);

      if (
        sectionsDataCaseInsensitive &&
        sectionsDataCaseInsensitive.length > 0
      ) {
        sectionsData = sectionsDataCaseInsensitive;
        sectionError = null;
      }
    }

    if (sectionError || !sectionsData || sectionsData.length === 0) {
      console.error(
        `[fetchStudentsByProgramAndSection] Error finding section "${trimmedSectionName}" in program "${trimmedProgramName}":`,
        sectionError
      );
      return [];
    }

    // If multiple sections found, we need to get all of them to find students
    // Students can be in any of these sections (same name, different terms)
    const sectionIds = sectionsData.map((s) => s.id);

    // Fetch students for this program and any of the matching sections
    // Since sections can have the same name for different terms, we need to check all matching section IDs
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, student_code, full_name")
      .eq("program_id", programData.id)
      .in("section_id", sectionIds)
      .order("full_name", { ascending: true });

    if (studentsError) {
      console.error(
        `[fetchStudentsByProgramAndSection] Error loading students:`,
        studentsError
      );
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
    const mappedStudents = studentsData.map((student) => {
      const submission = essaySubmissions.get(student.id);
      const hasSubmission = !!submission;

      return {
        id: String(student.id),
        name: student.full_name || student.student_code || "Unknown",
        status: (hasSubmission ? "submitted" : "not submitted") as
          | "submitted"
          | "not submitted",
        coherence: submission?.coherence,
        readability: submission?.readability,
        argumentative: submission?.argumentative,
        grammar: submission?.grammar,
        score: submission?.score,
      };
    });

    return mappedStudents;
  } catch (err) {
    console.error(
      `[fetchStudentsByProgramAndSection] Unexpected error loading students:`,
      err
    );
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

// Update essay file (replace existing submission)
export const updateEssayFile = async (
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
  activityId: string
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

// Fetch essay submission for a specific student and activity
export const fetchEssayByStudentAndActivity = async (
  studentId: string,
  activityId: string
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
  activityId: string
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

// Grade essay: OCR -> Analysis -> Save to Supabase -> Create notification
export const gradeEssay = async (
  studentId: string,
  studentName: string,
  activityId: string,
  onProgress?: (progress: number, step: string) => void
): Promise<{ success: boolean; error?: string }> => {
  try {
    onProgress?.(5, "Preparing...");

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

    // Fetch essay record
    const { data: essayData, error: essayError } = await supabase
      .from("essays")
      .select("id, file_path, title")
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
      }
    );

    onProgress?.(20, "Extracting text from PDF (OCR)...");

    // Step 1: OCR - Extract text from PDF (automatic, no confirmation needed)
    // Since all students submit PDFs, we always use OCR to extract text
    const { ocrApi } = await import("../api");
    let extractedText: string;
    try {
      const ocrResult = await ocrApi.extractTextFromFile(file);
      extractedText = ocrResult.text;
      if (!extractedText || extractedText.trim().length < 10) {
        return {
          success: false,
          error:
            "Failed to extract text from PDF. The file may be corrupted or unreadable.",
        };
      }
      onProgress?.(40, "Text extracted successfully, analyzing essay...");
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

      const rubricId = activityData?.rubric_id
        ? String(activityData.rubric_id)
        : undefined;

      analysisResult = await analysisApi.analyzeText(
        extractedText,
        essayData.title || "Essay",
        "comprehensive",
        rubricId
      );
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
        teacher_id: teacherId,
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
          typeof e.offset === "number" && typeof e.errorLength === "number"
      );
      if (
        grammarErrors.length > 0 &&
        errorsWithOffsets.length < grammarErrors.length
      ) {
        console.warn(
          `Warning: ${
            grammarErrors.length - errorsWithOffsets.length
          } grammar errors missing offset/errorLength for highlighting`
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
            "essay_analysis_results table not found. Please run the migration: supabase/create_essay_analysis_results_table.sql"
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
        tableError
      );
      console.warn(
        "Analysis results saved to essays table. Please run migration to enable full features."
      );
    }

    onProgress?.(95, "Finalizing...");

    // Step 4: Create notification for teacher
    if (teacherId) {
      // Get activity title
      const { data: activityData } = await supabase
        .from("essay_activities")
        .select("title")
        .eq("id", activityDbId)
        .single();

      const activityTitle = activityData?.title || "Essay";

      // Create notification with metadata including studentId for fetching all results
      await supabase.from("notifications").insert({
        teacher_id: teacherId,
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
  activityId: string
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
        "essay_analysis_results table not accessible, using fallback"
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
                fallbackEssay.file_path.split("/").pop() || "essay.pdf"
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
  studentId: string
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
      `
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
      }
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
  textField: "original_text" | "content"
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
      console.log(
        `[processSimilarityGroups] Mapped essay ${essayId} with text length ${text.length}`
      );
    } else {
      console.log(
        `[processSimilarityGroups] Skipping item - text: ${!!text}, essayId: ${essayId}, essay_id: ${
          item.essay_id
        }`
      );
    }
  }

  console.log(
    `[processSimilarityGroups] Total essays in text map: ${essayTexts.size}, total groups: ${groups.size}`
  );

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

  console.log(
    `[processSimilarityGroups] Collected ${allEssays.length} essays from ${groups.size} hash groups for comparison`
  );

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
      console.log(
        `[fetchDuplicateEssays] Comparing essay ${allEssays[i].essayId} vs ${
          allEssays[j].essayId
        }: similarity = ${(similarity * 100).toFixed(1)}%`
      );
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
  activityId: string
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
        essays!inner(
          id,
          title,
          submitted_at,
          students!inner(
            id,
            full_name,
            sections!inner(
              id,
              name,
              programs!inner(
                id,
                name
              )
            )
          )
        )
      `
      )
      .eq("activity_id", activityDbId);

    if (error) {
      console.error(
        "[fetchDuplicateEssays] Error fetching analysis results:",
        error
      );
    }

    if (!analysisResults || analysisResults.length === 0) {
      console.log(
        `[fetchDuplicateEssays] No analysis results found. Trying fallback to essays table...`
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
          students!inner(
            id,
            full_name,
            sections!inner(
              id,
              name,
              programs!inner(
                id,
                name
              )
            )
          )
        `
        )
        .eq("activity_id", activityDbId);

      if (essaysError) {
        console.error(
          "[fetchDuplicateEssays] Error fetching essays:",
          essaysError
        );
      }

      if (!essaysData || essaysData.length === 0) {
        console.log(
          `[fetchDuplicateEssays] No essays found for activity ${activityDbId}`
        );
        return [];
      }

      console.log(
        `[fetchDuplicateEssays] Found ${essaysData.length} essays (fallback). Attempting to use content field...`
      );

      // Try to use essays.content if available
      type EssayWithNested = {
        id: number;
        title: string;
        submitted_at: string;
        content?: string | null;
        students?: {
          id: number;
          full_name: string;
          sections?: {
            id: number;
            name: string;
            programs?: {
              id: number;
              name: string;
            };
          };
        };
      };

      const essaysWithContent = (
        essaysData as unknown as EssayWithNested[]
      ).filter((e) => e.content && e.content.trim().length >= 50);

      if (essaysWithContent.length < 2) {
        console.log(
          `[fetchDuplicateEssays] Not enough essays with content for comparison (need at least 2, found ${essaysWithContent.length})`
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
        const section = student?.sections;
        const program = section?.programs;

        if (!student || !section || !program) {
          continue;
        }

        const essayInfo = {
          essayId: essay.id,
          studentId: student.id,
          studentName: student.full_name || "Unknown",
          programName: program.name || "Unknown",
          sectionName: section.name || "Unknown",
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
        "content"
      );
    }

    console.log(
      `[fetchDuplicateEssays] Found ${analysisResults.length} analysis results`
    );

    // Group essays by content hash
    const contentGroups = new Map<string, DuplicateEssayGroup["essays"]>();
    let validEssaysCount = 0;
    let skippedCount = 0;

    for (const result of analysisResults) {
      const originalText = result.original_text;
      if (!originalText || originalText.trim().length < 50) {
        skippedCount++;
        console.log(
          `[fetchDuplicateEssays] Skipping essay ${result.essay_id}: ${
            !originalText
              ? "no original_text"
              : `text too short (${originalText.trim().length} chars)`
          }`
        );
        continue; // Skip essays without text or too short
      }

      // Supabase returns nested data - handle the structure
      type EssayDataStructure = {
        id: number;
        title: string;
        submitted_at: string;
        students?: {
          id: number;
          full_name: string;
          sections?: {
            id: number;
            name: string;
            programs?: {
              id: number;
              name: string;
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
        console.log(
          `[fetchDuplicateEssays] Essay data is null for essay_id ${result.essay_id}`
        );
        skippedCount++;
        continue;
      }

      // Type guard to ensure essayData is not null
      const student = essayData.students;
      const section = student?.sections;
      const program = section?.programs;

      if (!student || !section || !program) {
        console.log(
          `[fetchDuplicateEssays] Missing nested data for essay ${
            essayData.id || result.essay_id
          }:`,
          {
            hasEssay: !!essayData,
            hasStudent: !!student,
            hasSection: !!section,
            hasProgram: !!program,
          }
        );
        skippedCount++;
        continue;
      }

      const essayInfo = {
        essayId: essayData.id,
        studentId: student.id,
        studentName: student.full_name || "Unknown",
        programName: program.name || "Unknown",
        sectionName: section.name || "Unknown",
        title: essayData.title || "Untitled",
        submittedAt: essayData.submitted_at || new Date().toISOString(),
      };

      const contentHash = generateContentHash(originalText);
      console.log(
        `[fetchDuplicateEssays] Processing essay ${essayInfo.essayId} from ${
          essayInfo.programName
        } - ${essayInfo.sectionName} (${essayInfo.studentName}), text length: ${
          originalText.length
        }, hash: ${contentHash.substring(0, 50)}...`
      );

      if (!contentGroups.has(contentHash)) {
        contentGroups.set(contentHash, []);
      }
      contentGroups.get(contentHash)!.push(essayInfo);
      validEssaysCount++;
    }

    console.log(
      `[fetchDuplicateEssays] Processed ${validEssaysCount} valid essays, skipped ${skippedCount}, created ${contentGroups.size} hash groups`
    );

    // Use the helper function to process similarity groups
    const duplicateGroups = processSimilarityGroups(
      contentGroups,
      analysisResults.map((r) => ({
        essay_id: r.essay_id,
        original_text: r.original_text,
        essays: r.essays,
      })),
      "original_text"
    );

    // Log for debugging
    if (duplicateGroups.length > 0) {
      console.log(
        `[fetchDuplicateEssays] Found ${duplicateGroups.length} duplicate group(s) for activity ${activityId}`
      );
      duplicateGroups.forEach((group, idx) => {
        console.log(
          `  Group ${idx + 1}: ${
            group.essays.length
          } essays - Programs: ${Array.from(
            new Set(group.essays.map((e) => e.programName))
          ).join(", ")}`
        );
      });
    } else {
      console.log(
        `[fetchDuplicateEssays] No duplicates found for activity ${activityId}. Total essays checked: ${analysisResults.length}`
      );
    }

    return duplicateGroups;
  } catch (err) {
    console.error("Error fetching duplicate essays:", err);
    return [];
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
        essays!inner(
          id,
          submitted_at,
          students!inner(
            id,
            full_name,
            sections!inner(
              id,
              name,
              programs!inner(
                id,
                name
              )
            )
          )
        )
      `
      )
      .eq("teacher_id", teacherId)
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
      sectionMap.entries()
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
          full_name?: string;
        };
      };
      const essay = result.essays as EssayWithStudent | null | undefined;
      const student = essay?.students;
      if (student?.id && result.overall_score !== null) {
        const existing = studentScores.get(student.id) || {
          name: student.full_name || "Unknown",
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
          data.scores.reduce((a, b) => a + b, 0) / data.scores.length
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
          data.scores.reduce((a, b) => a + b, 0) / data.scores.length
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
