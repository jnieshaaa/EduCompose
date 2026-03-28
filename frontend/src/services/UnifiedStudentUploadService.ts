import { supabase } from "../lib/supabaseClient";
import { FileParserService } from "./FileParserService";
import { authApi } from "../api";

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

export type RowData = {
  student_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  department: string;
  program: string;
  year: number;
  block: string;
};

export type UploadFileConfig = {
  file: File;
  program?: string;
  year?: number;
  block?: string;
};

import { sendStudentWelcomeEmail } from "./emailService";

export class UnifiedStudentUploadService {
  /**
   * Processes a list of files and imports them into the system.
   * Handles creating missing programs, loads, and blocks as needed.
   */

  static async upload(
    fileConfigs: UploadFileConfig[],
    targetCourseId: string | null,
    academicContext: { ay: string; term: string }
  ): Promise<UnifiedUploadResult> {
    const { ay, term } = academicContext;
    const errors: string[] = [];
    let totalRows = 0;
    let importedCount = 0;
    let skippedCount = 0;
    const skippedStudentCodes: string[] = [];

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error("Not authenticated");
      const teacherUserId = authData.user.id;

      // 1. Parse all files and gather rows
      const allRows: RowData[] = [];
      for (const config of fileConfigs) {
        const file = config.file;
        const rawResult = await FileParserService.parseFileRaw(file);
        if (!rawResult.success) {
          errors.push(`File ${file.name}: ${rawResult.error}`);
          continue;
        }

        const rows = rawResult.rows;
        if (rows.length < 2) {
          errors.push(`File ${file.name}: Not enough data rows.`);
          continue;
        }

        let fileMeta = {
          program: config.program || "",
          year: config.year || 1,
          block: (config.block || "").toUpperCase()
        };

        // Row 0: Metadata, Row 1: Metadata, Row 2: Metadata
        // Row 3: Headers
        // Row 4: Data
        const row0 = rows[0] || [];
        const row1 = rows[1] || [];
        const row2 = rows[2] || [];
        const row3 = rows[3] || [];
        
        let headers: string[] = [];
        let dataStartIndex = 0;

        // We identified this as our special format if Row 3 contains standard student headers
        const hasStudentHeadersAtRow3 = row3.some(h => String(h).toLowerCase().includes("student id") || String(h).toLowerCase().includes("id"));
        
        if (hasStudentHeadersAtRow3) {
          // Function to extract value regardless of whether there's a label in Col 0
          const getMetaValue = (rowArr: string[], fallback: string | number) => {
            if (rowArr.length === 0) return fallback;
            if (rowArr.length === 1) return rowArr[0] || fallback;
            // If Row[0] looks like a label (e.g. "Program:"), take Row[1]
            const firstCell = String(rowArr[0]).toLowerCase();
            if (firstCell.includes("program") || firstCell.includes("year") || firstCell.includes("block") || firstCell.includes("section")) {
              return rowArr[1] || fallback;
            }
            return rowArr[0] || fallback;
          };

          fileMeta.program = String(getMetaValue(row0, fileMeta.program));
          fileMeta.year = parseInt(String(getMetaValue(row1, fileMeta.year))) || fileMeta.year;
          fileMeta.block = String(getMetaValue(row2, fileMeta.block)).toUpperCase();
          headers = row3.map((h: any) => String(h).trim());
          dataStartIndex = 4;
        } else {
          // Standard format: Headers are in first non-empty row
          headers = (rows[0] || []).map((h: any) => String(h).trim());
          dataStartIndex = 1;
        }

        for (let i = dataStartIndex; i < rows.length; i++) {
          const rawRowArr = rows[i];
          if (rawRowArr.length === 0 || (rawRowArr.length === 1 && !rawRowArr[0])) continue;
          
          // Map array back to object for getFieldValue
          const rowObj: any = {};
          headers.forEach((h, idx) => { rowObj[h] = rawRowArr[idx] || ""; });
          
          const rowNum = i + 1;

          const data: RowData = {
            student_code: this.getFieldValue(rowObj, ["student id", "student_id", "id", "student code"]),
            first_name: this.getFieldValue(rowObj, ["first name", "firstname", "first_name"]),
            middle_name: this.getFieldValue(rowObj, ["middle name", "middlename", "middle_name"]),
            last_name: this.getFieldValue(rowObj, ["last name", "lastname", "last_name"]),
            email: this.getFieldValue(rowObj, ["email", "email address", "email_address"]),
            department: this.getFieldValue(rowObj, ["department", "dept"]) || "N/A",
            program: this.getFieldValue(rowObj, ["program", "program name", "program_abbr"]) || fileMeta.program,
            year: parseInt(this.getFieldValue(rowObj, ["year level", "year_level", "year"])) || fileMeta.year,
            block: (this.getFieldValue(rowObj, ["block", "section", "block name", "block/section"]) || fileMeta.block).toUpperCase(),
          };

          if (!data.student_code || !data.first_name || !data.last_name || !data.program || !data.block) {
            errors.push(`File ${file.name}, Row ${rowNum}: Missing required fields (ID, Name, Program, or Block)`);
            continue;
          }

          allRows.push(data);
        }
      }

      totalRows = allRows.length;
      if (allRows.length === 0 && errors.length > 0) {
        return { success: false, message: "No valid rows found to import.", totalRows, imported: 0, importedCount, skippedCount, skippedStudentCodes, errors };
      }

      // 2. Identify all unique Programs/Blocks needed
      // Map to identify which Programs we need to ensure are in this teacher's load
      const programMap = new Map<string, { department?: string }>();
      allRows.forEach(r => programMap.set(r.program, { department: r.department }));

      // 3. Process batches
      // For each row, we do the linkage
      // Optimization: Group by Program and Block
      const grouped = new Map<string, Map<string, Map<number, RowData[]>>>();
      allRows.forEach(r => {
        if (!grouped.has(r.program)) grouped.set(r.program, new Map());
        const blockMap = grouped.get(r.program)!;
        if (!blockMap.has(r.block)) blockMap.set(r.block, new Map());
        const yearMap = blockMap.get(r.block)!;
        if (!yearMap.has(r.year)) yearMap.set(r.year, []);
        yearMap.get(r.year)!.push(r);
      });

      // We need a transaction-like loop
      for (const [progAbbr, blocksMap] of grouped.entries()) {
        // A. Ensure Program exists in programs_lookup
        let { data: progLookup, error: pError } = await supabase
          .from("programs_lookup")
          .select("id, name")
          .eq("abbr", progAbbr)
          .maybeSingle();
        
        if (pError) {
          errors.push(`Error checking program "${progAbbr}": ${pError.message}`);
        }
        
        if (!progLookup) {
           // Create it? Or skip with error? 
           // Usually users expect it to be created if missing, especially in a "bulk" tool.
           const { data: newProg, error: npError } = await supabase
            .from("programs_lookup")
            .insert({ name: progAbbr, abbr: progAbbr }) // Name same as abbr if unknown
            .select()
            .single();
          
          if (npError || !newProg) {
            errors.push(`Failed to create/find program "${progAbbr}": ${npError?.message || "Unknown error"}`);
            continue;
          }
          progLookup = newProg;
        }

        if (!progLookup) continue;
        const programId = progLookup.id;

        // B. Ensure Teacher has a load for this program in the target course
        if (!targetCourseId) {
            errors.push(`No target course provided for program "${progAbbr}"`);
            continue;
        }

        // B1. Get/Create teacher_course_loads
        let { data: courseLoad, error: clError } = await supabase
          .from("teacher_course_loads")
          .select("id")
          .eq("teacher_id", teacherUserId)
          .eq("course_id", targetCourseId)
          .eq("academic_year", ay)
          .eq("term", term)
          .maybeSingle();
        
        if (clError) {
          errors.push(`Error checking course load: ${clError.message}`);
        }

        if (!courseLoad) {
          const { data: newCL, error: nclError } = await supabase
            .from("teacher_course_loads")
            .insert({ teacher_id: teacherUserId, course_id: targetCourseId, academic_year: ay, term: term })
            .select()
            .single();
          
          if (nclError || !newCL) {
            errors.push(`Failed to create course load for ${targetCourseId}: ${nclError?.message || "Unknown error"}`);
            continue;
          }
          courseLoad = newCL;
        }

        if (!courseLoad) continue;
        // B2. Get/Create teacher_program_loads
        let { data: progLoad, error: plError } = await supabase
          .from("teacher_program_loads")
          .select("id")
          .eq("course_load_id", courseLoad.id)
          .eq("program_id", programId)
          .maybeSingle();
        
        if (plError) {
          errors.push(`Error checking program load: ${plError.message}`);
        }

        if (!progLoad) {
          const { data: newPL, error: nplError } = await supabase
            .from("teacher_program_loads")
            .insert({ course_load_id: courseLoad.id, program_id: programId })
            .select()
            .single();
          
          if (nplError || !newPL) {
            errors.push(`Failed to link program "${progAbbr}" to course: ${nplError?.message || "Unknown error"}`);
            continue;
          }
          progLoad = newPL;
        }

        // C. Processes Blocks
        for (const [blockName, yearsMap] of blocksMap.entries()) {
          for (const [year, rows] of yearsMap.entries()) {
            if (!progLoad) continue;
            // C1. Get/Create Block
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
                .insert({ program_load_id: progLoad.id, name: blockName, year: year, teacher_id: teacherUserId })
                .select()
                .single();
              
              if (nbError || !newB) {
                errors.push(`Failed to create block ${year}${blockName} for ${progAbbr}: ${nbError?.message || "Unknown error"}`);
                continue;
              }
              block = newB;
            }

            // D. Process Students in this block
            for (const studentRow of rows) {
              try {
                // Check if student exists (global registry)
                let { data: existingStudent } = await supabase
                  .from("students")
                  .select("id")
                  .eq("student_code", studentRow.student_code)
                  .maybeSingle();
                
                let studentId: string;
                if (existingStudent) {
                  studentId = existingStudent.id;
                  skippedCount++;
                  skippedStudentCodes.push(studentRow.student_code);
                } else {
                  // Create student with a simple initial password
                  const temp_password = `Edu${Math.floor(100000 + Math.random() * 900000)}`;
                  const { data: newS, error: nsError } = await supabase
                    .from("students")
                    .insert({
                      student_code: studentRow.student_code,
                      first_name: studentRow.first_name,
                      middle_name: studentRow.middle_name,
                      last_name: studentRow.last_name,
                      email: studentRow.email,
                      teacher_id: teacherUserId,
                      program_id: programId,
                      year: studentRow.year,
                      block_name: studentRow.block,
                    })
                    .select()
                    .single();
                  
                  if (nsError) {
                    errors.push(`Student ${studentRow.student_code}: ${nsError.message}`);
                    continue;
                  }
                  studentId = newS.id;
                  importedCount++;

                  // Provision authentication account first so emailed credentials are valid.
                  // If provisioning fails, we keep the student row but skip email to avoid sending unusable login details.
                  let isProvisioned = false;
                  try {
                    await authApi.provisionStudentAccount({
                      email: studentRow.email,
                      student_code: studentRow.student_code,
                      first_name: studentRow.first_name,
                      middle_name: studentRow.middle_name || "",
                      last_name: studentRow.last_name,
                      password: temp_password,
                    });
                    isProvisioned = true;
                  } catch (provisionErr) {
                    const provisionMessage =
                      provisionErr instanceof Error
                        ? provisionErr.message
                        : "Unknown provisioning error";
                    errors.push(
                      `Student ${studentRow.student_code}: Account created in roster, but auth provisioning failed (${provisionMessage}).`,
                    );
                  }

                  if (isProvisioned) {
                    // Send welcome email only after successful auth provisioning.
                    try {
                      await sendStudentWelcomeEmail({
                        to_name: `${studentRow.first_name} ${studentRow.last_name}`,
                        to_email: studentRow.email,
                        student_code: studentRow.student_code,
                        temp_password: temp_password
                      });
                    } catch (eEmail) {
                      console.warn(`Failed to send email to ${studentRow.email}`);
                      // Don't fail the whole upload for one email failure
                    }
                  }
                }

                if (!block) continue;
                // Ensure link to block
                await supabase
                  .from("block_students")
                  .upsert({ block_id: block.id, student_id: studentId }, { onConflict: "block_id,student_id" });
                
              } catch (err) {
                errors.push(`Unexpected error for student ${studentRow.student_code}`);
              }
            }
          }
        }
      }

      return {
        success: errors.length === 0 || importedCount > 0,
        message: `Processed ${totalRows} rows. ${importedCount} imported, ${skippedCount} existing students linked.`,
        totalRows,
        imported: importedCount,
        importedCount,
        skippedCount,
        skippedStudentCodes,
        errors,
      };

    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Fatal upload error",
        totalRows,
        imported: 0,
        importedCount,
        skippedCount,
        skippedStudentCodes,
        errors: [err instanceof Error ? err.message : "Unknown error"],
      };
    }
  }

  private static getFieldValue(row: any, possibleNames: string[]): string {
    for (const name of possibleNames) {
      if (row[name] !== undefined) return String(row[name]).trim();
      const key = Object.keys(row).find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
      if (key) return String(row[key]).trim();
    }
    return "";
  }
}
