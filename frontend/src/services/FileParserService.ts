/**
 * Model Layer: File Parser Service
 * Handles parsing of CSV and XLSX files
 */

export type ParsedRow = {
  [key: string]: string | number;
};

export type ParseResult = {
  success: boolean;
  data: ParsedRow[];
  headers: string[];
  error?: string;
};

export type RawParseResult = {
  success: boolean;
  rows: string[][];
  error?: string;
};

export class FileParserService {
  /**
   * Parse CSV file
   */
  static async parseCSV(file: File): Promise<ParseResult> {
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);

      if (lines.length < 2) {
        return {
          success: false,
          data: [],
          headers: [],
          error:
            "CSV file must include a header row and at least one data row.",
        };
      }

      // Parse header
      const headers = this.parseCSVLine(lines[0]);

      // Parse data rows
      const data: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length === 0) continue;

        const row: ParsedRow = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || "";
        });
        data.push(row);
      }

      return {
        success: true,
        data,
        headers,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        headers: [],
        error:
          error instanceof Error ? error.message : "Failed to parse CSV file",
      };
    }
  }

  /**
   * Parse XLSX file
   */
  static async parseXLSX(file: File): Promise<ParseResult> {
    try {
      // Dynamic import to avoid bundling xlsx in initial load
      const XLSX = await import("xlsx");

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      // Get first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as unknown[][];

      if (jsonData.length < 2) {
        return {
          success: false,
          data: [],
          headers: [],
          error:
            "XLSX file must include a header row and at least one data row.",
        };
      }

      // First row is headers
      const headers = (jsonData[0] as unknown[]).map((h) =>
        String(h || "").trim()
      );

      // Remaining rows are data
      const data: ParsedRow[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        if (!row || row.length === 0) continue;

        const parsedRow: ParsedRow = {};
        headers.forEach((header, index) => {
          parsedRow[header] =
            row[index] !== undefined ? String(row[index]).trim() : "";
        });
        data.push(parsedRow);
      }

      return {
        success: true,
        data,
        headers,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        headers: [],
        error:
          error instanceof Error ? error.message : "Failed to parse XLSX file",
      };
    }
  }

  /**
   * Parse file based on extension
   */
  static async parseFile(file: File): Promise<ParseResult> {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      return this.parseCSV(file);
    } else if (extension === "xlsx" || extension === "xls") {
      return this.parseXLSX(file);
    } else {
      return {
        success: false,
        data: [],
        headers: [],
        error: `Unsupported file type: ${extension}. Please upload a .csv or .xlsx file.`,
      };
    }
  }

  /**
   * Parse file and return raw rows as string[][]
   */
  static async parseFileRaw(file: File): Promise<RawParseResult> {
    const extension = file.name.split(".").pop()?.toLowerCase();
    try {
      if (extension === "csv") {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        return { success: true, rows: lines.map(line => this.parseCSVLine(line)) };
      } else if (extension === "xlsx" || extension === "xls") {
        const XLSX = await import("xlsx");
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        return { 
          success: true, 
          rows: jsonData.map(row => (row as any[]).map(cell => cell !== undefined ? String(cell).trim() : "")) 
        };
      }
      return { success: false, rows: [], error: "Unsupported file type" };
    } catch (e) {
      return { success: false, rows: [], error: e instanceof Error ? e.message : "Raw parse failed" };
    }
  }

  /**
   * Parse CSV line handling quoted values
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // End of field
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current);

    return result.map((field) => field.trim().replace(/^"|"$/g, ""));
  }
}
