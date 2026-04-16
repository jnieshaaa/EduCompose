/**
 * Controller Layer: Batch Upload Controller
 * Handles business logic for batch uploads
 */

import { FileParserService } from "./FileParserService";
import type { ParsedRow } from "./FileParserService";
import type { Program, Section, Student } from "../types/Common";

export type UploadResult = {
  success: boolean;
  message: string;
  imported: number;
  errors: string[];
  data?: unknown[];
};

export type UploadType = "programs" | "sections" | "students";

export class BatchUploadController {
  /**
   * Handle batch upload for programs
   */
  static async uploadPrograms(
    file: File,
    existingPrograms: Program[],
  ): Promise<UploadResult> {
    const parseResult = await FileParserService.parseFile(file);

    if (!parseResult.success) {
      return {
        success: false,
        message: parseResult.error || "Failed to parse file",
        imported: 0,
        errors: [parseResult.error || "Unknown error"],
      };
    }

    const errors: string[] = [];
    const imported: Program[] = [];
    let nextId =
      existingPrograms.length > 0
        ? Math.max(
            ...existingPrograms.map(
              (p) => Number.parseInt(String(p.id), 10) || 0,
            ),
          ) + 1
        : 1;

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

      try {
        // Map CSV/XLSX columns to Program fields
        const name = this.getFieldValue(row, [
          "name",
          "program name",
          "program_name",
          "program",
        ]);

        if (!name) {
          errors.push(`Row ${rowNum}: Program name is required`);
          continue;
        }

        // Check for duplicates
        if (
          existingPrograms.some(
            (p) => p.name.toLowerCase() === name.toLowerCase(),
          ) ||
          imported.some((p) => p.name.toLowerCase() === name.toLowerCase())
        ) {
          errors.push(`Row ${rowNum}: Program "${name}" already exists`);
          continue;
        }

        const program: Program = {
          id: String(nextId++),
          name: name.trim(),
        };

        imported.push(program);
      } catch (error) {
        errors.push(
          `Row ${rowNum}: ${
            error instanceof Error ? error.message : "Invalid data"
          }`,
        );
      }
    }

    return {
      success: imported.length > 0,
      message: `Imported ${imported.length} program(s)${
        errors.length > 0 ? ` with ${errors.length} error(s)` : ""
      }`,
      imported: imported.length,
      errors,
      data: imported,
    };
  }

  /**
   * Handle batch upload for sections
   */
  static async uploadSections(
    file: File,
    existingSections: Section[],
    availablePrograms: string[],
    defaultProgram?: string,
  ): Promise<UploadResult> {
    const parseResult = await FileParserService.parseFile(file);

    if (!parseResult.success) {
      return {
        success: false,
        message: parseResult.error || "Failed to parse file",
        imported: 0,
        errors: [parseResult.error || "Unknown error"],
      };
    }

    const errors: string[] = [];
    const imported: Section[] = [];
    let nextId =
      existingSections.length > 0
        ? Math.max(...existingSections.map((s) => Number(s.id) || 0)) + 1
        : 1;

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNum = i + 2;

      try {
        const name = this.getFieldValue(row, [
          "name",
          "section name",
          "section_name",
          "section",
          "block name",
          "block_name",
          "block",
        ]);
        // Use default program if provided, otherwise read from CSV
        const program =
          defaultProgram ||
          this.getFieldValue(row, ["program", "program name", "program_name"]);
        const term = this.getFieldValue(row, [
          "term",
          "academic term",
          "academic_term",
          "semester",
        ]);
        const students =
          parseInt(
            this.getFieldValue(row, [
              "students",
              "expected students",
              "expected_students",
              "student_count",
            ]),
            10,
          ) || 0;

        if (!name) {
          errors.push(`Row ${rowNum}: Section name is required`);
          continue;
        }

        if (!program) {
          errors.push(`Row ${rowNum}: Program is required`);
          continue;
        }

        if (!availablePrograms.includes(program)) {
          errors.push(`Row ${rowNum}: Program "${program}" does not exist`);
          continue;
        }

        if (!term) {
          errors.push(`Row ${rowNum}: Academic term is required`);
          continue;
        }

        // Check for duplicates
        const duplicate =
          existingSections.some(
            (s) =>
              s.name.toLowerCase() === name.toLowerCase() &&
              (s.program || "").toLowerCase() === program.toLowerCase() &&
              (s.term || "").toLowerCase() === term.toLowerCase(),
          ) ||
          imported.some(
            (s) =>
              s.name.toLowerCase() === name.toLowerCase() &&
              (s.program || "").toLowerCase() === program.toLowerCase() &&
              (s.term || "").toLowerCase() === term.toLowerCase(),
          );

        if (duplicate) {
          errors.push(
            `Row ${rowNum}: Section "${name}" already exists for this program and term`,
          );
          continue;
        }

        const section: Section = {
          id: nextId++,
          name: name.trim(),
          program: program.trim(),
          term: term.trim(),
          students,
          essays: 0,
        };

        imported.push(section);
      } catch (error) {
        errors.push(
          `Row ${rowNum}: ${
            error instanceof Error ? error.message : "Invalid data"
          }`,
        );
      }
    }

    return {
      success: imported.length > 0,
      message: `Imported ${imported.length} section(s)${
        errors.length > 0 ? ` with ${errors.length} error(s)` : ""
      }`,
      imported: imported.length,
      errors,
      data: imported,
    };
  }

  /**
   * Handle batch upload for students
   */
  static async uploadStudents(
    file: File,
    existingStudents: Student[],
    availablePrograms: string[],
    availableSections: string[],
    defaultProgram?: string,
    defaultSection?: string,
  ): Promise<UploadResult> {
    const parseResult = await FileParserService.parseFile(file);

    if (!parseResult.success) {
      return {
        success: false,
        message: parseResult.error || "Failed to parse file",
        imported: 0,
        errors: [parseResult.error || "Unknown error"],
      };
    }

    const errors: string[] = [];
    const imported: Student[] = [];

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNum = i + 2;

      try {
        const id = this.getFieldValue(row, [
          "id",
          "student id",
          "student_id",
          "studentid",
        ]).toUpperCase();
        const firstName = this.getFieldValue(row, [
          "firstname",
          "first name",
          "first_name",
          "given name",
          "given_name",
        ]);
        const middleName = this.getFieldValue(row, [
          "middlename",
          "middle name",
          "middle_name",
          "m.i.",
          "mi",
        ]);
        const lastName = this.getFieldValue(row, [
          "lastname",
          "last name",
          "last_name",
          "family name",
          "family_name",
        ]);
        // Backwards-compat: if old single-name columns exist, use them and split
        const legacyFullName = this.getFieldValue(row, [
          "name",
          "full name",
          "full_name",
          "student name",
          "student_name",
        ]);
        const email = this.getFieldValue(row, [
          "email",
          "email address",
          "email_address",
        ]);
        // Use default program/section if provided, otherwise read from CSV
        const program =
          defaultProgram ||
          this.getFieldValue(row, ["program", "program name", "program_name"]);
        const yearLevel = this.getFieldValue(row, [
          "year level",
          "year_level",
          "year",
          "level",
          "yr",
        ]);
        const section =
          defaultSection ||
          this.getFieldValue(row, [
            "section",
            "section name",
            "section_name",
            "block",
            "block name",
            "block_name",
            "block/section",
          ]);

        if (!id) {
          errors.push(`Row ${rowNum}: Student ID is required`);
          continue;
        }

        const effectiveFirstName =
          firstName || (legacyFullName ? legacyFullName.split(" ")[0] : "");
        const effectiveLastName =
          lastName ||
          (legacyFullName ? legacyFullName.split(" ").slice(-1)[0] : "");
        const effectiveMiddleName =
          middleName ||
          (legacyFullName
            ? legacyFullName.split(" ").slice(1, -1).join(" ")
            : "");

        if (!effectiveFirstName || !effectiveLastName) {
          errors.push(`Row ${rowNum}: First name and last name are required`);
          continue;
        }

        if (!email || !this.isValidEmail(email)) {
          errors.push(`Row ${rowNum}: Valid email is required`);
          continue;
        }

        // Validate program (only if not using default)
        if (!defaultProgram) {
          if (!program || !availablePrograms.includes(program)) {
            errors.push(`Row ${rowNum}: Valid program is required`);
            continue;
          }
        } else if (!availablePrograms.includes(program)) {
          errors.push(
            `Row ${rowNum}: Default program "${program}" is not available`,
          );
          continue;
        }

        // Validate section (only if not using default)
        if (!defaultSection) {
          if (!section || !availableSections.includes(section)) {
            errors.push(`Row ${rowNum}: Valid section is required`);
            continue;
          }
        } else if (!availableSections.includes(section)) {
          errors.push(
            `Row ${rowNum}: Default section "${section}" is not available`,
          );
          continue;
        }

        // Check for duplicates
        if (
          existingStudents.some((s) => s.id === id) ||
          imported.some((s) => s.id === id)
        ) {
          errors.push(`Row ${rowNum}: Student ID "${id}" already exists`);
          continue;
        }

        const studentNameParts = [
          effectiveFirstName.trim(),
          effectiveMiddleName.trim(),
          effectiveLastName.trim(),
        ].filter(Boolean);

        const student: Student = {
          id: id.trim(),
          student_code: id.trim(),
          name: studentNameParts.join(" "),
          email: email.trim(),
          program: program.trim(),
          section: section.trim(),
          yearLevel: yearLevel.trim(),
          submitted: 0,
          pending: 0,
          avgScore: 0,
          missing: 0,
        };

        imported.push(student);
      } catch (error) {
        errors.push(
          `Row ${rowNum}: ${
            error instanceof Error ? error.message : "Invalid data"
          }`,
        );
      }
    }

    return {
      success: imported.length > 0,
      message: `Imported ${imported.length} student(s)${
        errors.length > 0 ? ` with ${errors.length} error(s)` : ""
      }`,
      imported: imported.length,
      errors,
      data: imported,
    };
  }

  /**
   * Get field value from row with multiple possible column names
   */
  private static getFieldValue(
    row: ParsedRow,
    possibleNames: string[],
  ): string {
    for (const name of possibleNames) {
      // Try exact match
      if (row[name]) return String(row[name]);

      // Try case-insensitive match
      const key = Object.keys(row).find(
        (k) => k.toLowerCase().trim() === name.toLowerCase().trim(),
      );
      if (key) return String(row[key]);
    }
    return "";
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
