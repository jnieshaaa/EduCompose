import { supabase } from "../lib/supabaseClient";
import { FileParserService } from "./FileParserService";
import { createNotification } from "./notificationService";

export type UnifiedUploadResult = {
  success: boolean;
  message: string;
  totalRows: number;
  imported: number;
  importedCount: number;
  skippedCount: number;
  skippedStudentCodes: string[];
  errors: string[];
  data?: any[];
};

export type StudentUploadRow = {
  email: string;
  student_code: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  program: string;
  year: number;
  block: string;
};

export type UploadFileConfig = {
  file: File;
  program: string;
  year: number;
  block: string;
};

export class UnifiedStudentUploadService {
  /**
   * Performs a batch upload of students across multiple files.
   * This logic handles both file parsing and atomic enrollment.
   */
  static async upload(
    configs: UploadFileConfig[],
    _targetCourseId: string, // Kept for signature compatibility; prefix with _ if unused in body
    context: { ay: string; term: string }
  ): Promise<UnifiedUploadResult> {
    let totalRows = 0;
    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const skippedStudentCodes: string[] = [];

    try {
      // 1. Get current teacher context
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Authentication required");

      const { data: teacherUser } = await supabase
        .from("users")
        .select("auth_user_id")
        .eq("auth_user_id", authUser.id)
        .single();
      
      const teacherUserId = teacherUser?.auth_user_id || authUser.id;

      // 2. Process each file configuration
      for (const config of configs) {
        const rawParse = await FileParserService.parseFileRaw(config.file);
        if (!rawParse.success) {
          errors.push(`File ${config.file.name}: ${rawParse.error || "Parse failed"}`);
          continue;
        }

        const rows = rawParse.rows;
        if (rows.length < 4) {
          errors.push(`File ${config.file.name}: Invalid template format (too few rows)`);
          continue;
        }

        // Determine effective mapping for this file
        const progAbbr = (config.program || "").toUpperCase();
        const year = config.year || 1;
        const blockName = (config.block || "").toUpperCase();

        if (!progAbbr) {
          errors.push(`File ${config.file.name}: No program specified`);
          continue;
        }

        // A. Resolve Program ID
        const { data: prog } = await supabase
          .from("programs_lookup")
          .select("id")
          .eq("abbr", progAbbr)
          .maybeSingle();
        
        if (!prog) {
          errors.push(`File ${config.file.name}: Program "${progAbbr}" not found in database`);
          continue;
        }

        // B. Ensure Teacher Course Load is linked to this program
        // We look for a load that matches the target course (if any) or any valid load for this teacher
        // Note: For now we use the context to find relevant loads
        const { data: loadData } = await supabase
          .from("teacher_course_loads")
          .select("id")
          .eq("teacher_id", teacherUserId)
          .eq("course_id", _targetCourseId) // Using the targetCourseId here
          .eq("academic_year", context.ay)
          .eq("term", context.term)
          .maybeSingle();

        if (!loadData) {
          errors.push(`File ${config.file.name}: No active course load found for ${_targetCourseId} in ${context.ay} ${context.term}`);
          continue;
        }

        // C. Check if teacher_program_load exists (AUTO-CREATE if missing)
        let { data: progLoad } = await supabase
          .from("teacher_program_loads")
          .select("id")
          .eq("course_load_id", loadData.id)
          .eq("program_id", prog.id)
          .maybeSingle();

        if (!progLoad) {
           // Auto-associate the program to this subject load
           const { data: newProgLoad, error: plError } = await supabase
             .from("teacher_program_loads")
             .insert({
                course_load_id: loadData.id,
                program_id: prog.id
             })
             .select()
             .single();
           
           if (plError || !newProgLoad) {
             errors.push(`Failed to auto-assign program "${progAbbr}" to subject: ${plError?.message || "Unknown error"}`);
             continue;
           }
           progLoad = newProgLoad;
        }

        if (!progLoad) continue;

        // D. Resolve or Create Block
        let { data: block, error: bError } = await supabase
          .from("blocks")
          .select("id")
          .eq("program_load_id", progLoad.id)
          .eq("name", blockName)
          .eq("year", year)
          .maybeSingle();
        
        if (bError) {
          errors.push(`Error checking block: ${bError.message}`);
        }

        if (!block) {
          const { data: newB, error: nbError } = await supabase
            .from("blocks")
            .insert({ 
               program_load_id: progLoad.id, 
               name: blockName, 
               year: year, 
               teacher_id: teacherUserId 
            })
            .select()
            .single();
          
          if (nbError || !newB) {
            errors.push(`Failed to create block ${year}${blockName} for ${progAbbr}: ${nbError?.message || "Unknown error"}`);
            continue;
          }
          block = newB;
        }

        if (!block) continue;

        // E. Extract Student Data (Starts at row 4)
        const headerRow = rows[3];
        const studentRows = rows.slice(4);

        for (const row of studentRows) {
          if (row.length === 0 || !row.some(c => c.trim())) continue;
          totalRows++;

          try {
            // Map row to data based on common headers
            const studentCode = this.getFieldValue(row, headerRow, ["student id", "id", "code", "student_code"]);
            const firstName = this.getFieldValue(row, headerRow, ["first name", "firstname", "first_name", "first"]);
            const lastName = this.getFieldValue(row, headerRow, ["last name", "lastname", "last_name", "last"]);
            const email = this.getFieldValue(row, headerRow, ["email", "e-mail", "email_address"]);
            const middleName = this.getFieldValue(row, headerRow, ["middle name", "middlename", "middle_name", "middle"]);
            const birthday = this.getFieldValue(row, headerRow, ["birthday", "birth date", "birthdate", "birth_date"]);

            if (!studentCode || !firstName || !lastName || !email) {
              errors.push(`Row ${totalRows + 4}: Missing required student data (ID, Name, or Email)`);
              continue;
            }

            // Student Code Format Validation: XXX-XXXX
            const studentCodeRegex = /^\d{3}-\d{4}$/;
            if (!studentCodeRegex.test(studentCode)) {
              errors.push(`Row ${totalRows + 4}: Invalid Student ID format "${studentCode}". Expected XXX-XXXX (e.g., 123-4567).`);
              continue;
            }

            // 1. Check if student already exists in OFFICIAL students table
            const { data: existingStudent } = await supabase
              .from("students")
              .select("id, student_code")
              .eq("student_code", studentCode)
              .maybeSingle();
            
            if (existingStudent) {
              skippedCount++;
              skippedStudentCodes.push(studentCode);
              // Not an error, just something to skip
              continue;
            }

            // 2. Check if student already has a PENDING registration
            const { data: pendingExists } = await supabase
              .from("pending_student_registrations")
              .select("id")
              .eq("student_code", studentCode)
              .eq("processed", false)
              .maybeSingle();
            
            if (pendingExists) {
              errors.push(`Row ${totalRows + 4}: Student ${studentCode} is already in the pending approval list.`);
              continue;
            }

            // 3. Insert into pending registrations instead of atomic enrollment
            const { error: insertError } = await supabase
              .from("pending_student_registrations")
              .insert({
                teacher_id: teacherUserId,
                course_id: _targetCourseId,
                program_id: prog.id,
                student_code: studentCode,
                first_name: firstName,
                last_name: lastName,
                middle_name: middleName || null,
                email: email,
                birthday: birthday || null, // Capture birthday here
                year: year,
                block_name: blockName,
                academic_year: context.ay,
                term: context.term
              });

            if (!insertError) {
              importedCount++;
            } else {
              errors.push(`Row ${totalRows + 4}: ${insertError.message}`);
            }
          } catch (err: any) {
            errors.push(`Row ${totalRows + 4}: ${err.message || "Unknown error"}`);
          }
        }

        // F. Notify Admins about new pending students
        if (importedCount > 0) {
          try {
            const { data: admins } = await supabase
              .from("users")
              .select("auth_user_id")
              .eq("role", "admin");

            if (admins && admins.length > 0) {
              const { data: teacherData } = await supabase.auth.getUser();
              const teacherName = teacherData.user?.user_metadata?.first_name 
                ? `${teacherData.user.user_metadata.first_name} ${teacherData.user.user_metadata.last_name || ""}`
                : "A teacher";

              for (const admin of admins) {
                await createNotification({
                  user_id: admin.auth_user_id,
                  type: "info",
                  title: "Pending Student Approvals",
                  message: `${teacherName} has submitted ${importedCount} students for approval.`,
                });
              }
            }
          } catch (notifErr) {
            console.error("Failed to notify admins:", notifErr);
          }
        }
      }

      return {
        success: true,
        message: `Success! ${importedCount} students were submitted for approval. They will appear in your list once an Admin approves them.`,
        totalRows,
        imported: importedCount, 
        importedCount,
        skippedCount,
        skippedStudentCodes,
        errors,
      };

    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Fatal upload error",
        totalRows,
        imported: 0,
        importedCount: 0,
        skippedCount: 0,
        skippedStudentCodes: [],
        errors: [err.message || "Unknown error"],
      };
    }
  }

  private static getFieldValue(row: string[], headers: string[], possibleNames: string[]): string {
    const targetNames = possibleNames.map(n => n.toLowerCase());
    const index = headers.findIndex(h => targetNames.includes(h.toLowerCase().trim()));
    if (index !== -1 && row[index]) {
      return row[index].trim();
    }
    return "";
  }
}

export const unifiedStudentUploadService = new UnifiedStudentUploadService();
