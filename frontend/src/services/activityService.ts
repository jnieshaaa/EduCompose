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

    console.log(
      `[fetchStudentsByProgramAndSection] Fetching students for program: "${trimmedProgramName}", section: "${trimmedSectionName}", activityId: ${activityId}`
    );

    // First, get program and section IDs from names
    // Try exact match first
    let { data: programData, error: programError } = await supabase
      .from("programs")
      .select("id, name")
      .eq("name", trimmedProgramName)
      .single();

    // If exact match fails, try case-insensitive
    if (programError || !programData) {
      console.log(
        `[fetchStudentsByProgramAndSection] Exact match failed, trying case-insensitive search for program`
      );
      const { data: programsData } = await supabase
        .from("programs")
        .select("id, name")
        .ilike("name", trimmedProgramName);
      
      if (programsData && programsData.length > 0) {
        programData = programsData[0];
        programError = null;
        console.log(
          `[fetchStudentsByProgramAndSection] Found program with case-insensitive match: "${programData.name}" (ID: ${programData.id})`
        );
      }
    }

    if (programError || !programData) {
      console.error(
        `[fetchStudentsByProgramAndSection] Error finding program "${trimmedProgramName}":`,
        programError
      );
      // Let's also list all available programs for debugging
      const { data: allPrograms } = await supabase
        .from("programs")
        .select("id, name");
      console.log(
        `[fetchStudentsByProgramAndSection] Available programs:`,
        allPrograms
      );
      return [];
    }

    console.log(
      `[fetchStudentsByProgramAndSection] Found program "${programData.name}" with ID: ${programData.id}`
    );

    // Try exact match first for section
    // Note: Sections can have the same name for different terms, so we might get multiple results
    let { data: sectionsData, error: sectionError } = await supabase
      .from("sections")
      .select("id, name, term")
      .eq("name", trimmedSectionName)
      .eq("program_id", programData.id);

    // If exact match fails, try case-insensitive
    if (sectionError || !sectionsData || sectionsData.length === 0) {
      console.log(
        `[fetchStudentsByProgramAndSection] Exact match failed, trying case-insensitive search for section`
      );
      const { data: sectionsDataCaseInsensitive } = await supabase
        .from("sections")
        .select("id, name, term")
        .ilike("name", trimmedSectionName)
        .eq("program_id", programData.id);
      
      if (sectionsDataCaseInsensitive && sectionsDataCaseInsensitive.length > 0) {
        sectionsData = sectionsDataCaseInsensitive;
        sectionError = null;
        console.log(
          `[fetchStudentsByProgramAndSection] Found ${sectionsData.length} section(s) with case-insensitive match`
        );
      }
    }

    if (sectionError || !sectionsData || sectionsData.length === 0) {
      console.error(
        `[fetchStudentsByProgramAndSection] Error finding section "${trimmedSectionName}" in program "${trimmedProgramName}":`,
        sectionError
      );
      // Let's also list all available sections for this program for debugging
      const { data: allSections } = await supabase
        .from("sections")
        .select("id, name, term, program_id")
        .eq("program_id", programData.id);
      console.log(
        `[fetchStudentsByProgramAndSection] Available sections for program "${trimmedProgramName}":`,
        allSections
      );
      return [];
    }

    // If multiple sections found, we need to get all of them to find students
    // Students can be in any of these sections (same name, different terms)
    const sectionIds = sectionsData.map((s) => s.id);
    const sectionData = sectionsData[0]; // Use first one for logging

    console.log(
      `[fetchStudentsByProgramAndSection] Found ${sectionsData.length} section(s) with name "${sectionData.name}":`,
      sectionsData.map((s) => `ID: ${s.id}, Term: ${s.term || "null"}`)
    );

    console.log(
      `[fetchStudentsByProgramAndSection] Found section "${sectionData.name}" with ID: ${sectionData.id}`
    );

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
      console.log(
        `[fetchStudentsByProgramAndSection] No students found for program "${programName}" and section "${sectionName}"`
      );
      return [];
    }

    console.log(
      `[fetchStudentsByProgramAndSection] Found ${studentsData.length} students`
    );

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
        status: hasSubmission ? "submitted" : "not submitted",
        coherence: submission?.coherence,
        readability: submission?.readability,
        argumentative: submission?.argumentative,
        grammar: submission?.grammar,
        score: submission?.score,
      };
    });

    console.log(
      `[fetchStudentsByProgramAndSection] Returning ${mappedStudents.length} students`
    );
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
