import type { CriteriaRow, ScoreLevel } from "../components/rubrics/types";

export interface ImportedRubric {
  name: string;
  description?: string;
  gradingIntensity: "Basic" | "Professional" | "Advanced" | "Technical";
  programs: string[];
  criteria: CriteriaRow[];
}

export interface ImportResult {
  success: boolean;
  rubric?: ImportedRubric;
  error?: string;
}

/**
 * Parse a JSON file containing rubric data
 */
export async function parseRubricJSON(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate required fields
    if (!data.name || typeof data.name !== "string") {
      return {
        success: false,
        error: 'Rubric must have a "name" field (string)',
      };
    }

    if (
      !data.criteria ||
      !Array.isArray(data.criteria) ||
      data.criteria.length === 0
    ) {
      return {
        success: false,
        error:
          'Rubric must have at least one criterion in the "criteria" array',
      };
    }

    // Validate and parse criteria
    const parsedCriteria: CriteriaRow[] = [];
    for (let i = 0; i < data.criteria.length; i++) {
      const criterion = data.criteria[i];

      if (!criterion.title || typeof criterion.title !== "string") {
        return {
          success: false,
          error: `Criterion ${i + 1} must have a "title" field (string)`,
        };
      }

      if (
        !criterion.scores ||
        !Array.isArray(criterion.scores) ||
        criterion.scores.length === 0
      ) {
        return {
          success: false,
          error: `Criterion "${criterion.title}" must have at least one score level in the "scores" array`,
        };
      }

      // Validate and parse score levels
      const parsedScores: ScoreLevel[] = [];
      for (let j = 0; j < criterion.scores.length; j++) {
        const score = criterion.scores[j];

        if (!score.title || typeof score.title !== "string") {
          return {
            success: false,
            error: `Score level ${j + 1} in criterion "${
              criterion.title
            }" must have a "title" field (string)`,
          };
        }

        if (typeof score.points !== "number" || score.points < 0) {
          return {
            success: false,
            error: `Score level "${score.title}" in criterion "${criterion.title}" must have a valid "points" field (number >= 0)`,
          };
        }

        parsedScores.push({
          id: String(score.id || j + 1),
          title: score.title,
          points: score.points,
          description: score.description || "",
        });
      }

      parsedCriteria.push({
        id: String(criterion.id || i + 1),
        title: criterion.title,
        scores: parsedScores,
      });
    }

    // Parse optional fields
    const gradingIntensity = data.gradingIntensity || "Basic";
    if (
      !["Basic", "Professional", "Advanced", "Technical"].includes(
        gradingIntensity
      )
    ) {
      return {
        success: false,
        error:
          "gradingIntensity must be one of: Basic, Professional, Advanced, Technical",
      };
    }

    const programs = Array.isArray(data.programs) ? data.programs : [];
    const description =
      typeof data.description === "string" ? data.description : "";

    return {
      success: true,
      rubric: {
        name: data.name,
        description,
        gradingIntensity,
        programs,
        criteria: parsedCriteria,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to parse JSON file",
    };
  }
}

/**
 * Parse an Excel file containing rubric data
 * Expected format:
 * Row 1: Rubric Name | [name]
 * Row 2: Description | [description]
 * Row 3: Grading Intensity | Basic/Professional/Advanced/Technical
 * Row 4: Programs | [comma-separated programs]
 * Row 5: (empty)
 * Row 6: Criterion | Score Level 1 | Points 1 | Score Level 2 | Points 2 | ...
 * Row 7+: Criteria data rows
 */
export async function parseRubricExcel(file: File): Promise<ImportResult> {
  try {
    // Use XLSX directly to get raw row data
    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to array of arrays (raw rows)
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
    }) as unknown[][];

    if (rawData.length < 7) {
      return {
        success: false,
        error:
          "Excel file must have at least 7 rows (header info + criteria data)",
      };
    }

    // Extract rubric info from first rows (key-value format)
    // Row 1: [Label, Value] format
    const nameRow = rawData[0] as unknown[];
    const descriptionRow = rawData[1] as unknown[];
    const intensityRow = rawData[2] as unknown[];
    const programsRow = rawData[3] as unknown[];

    // Get value from second column (index 1)
    const name = String(nameRow[1] || "").trim();
    if (!name) {
      return {
        success: false,
        error: "Row 1, Column 2 must contain the rubric name",
      };
    }

    const description = String(descriptionRow[1] || "").trim();
    const gradingIntensity = String(intensityRow[1] || "Basic").trim();

    if (
      !["Basic", "Professional", "Advanced", "Technical"].includes(
        gradingIntensity
      )
    ) {
      return {
        success: false,
        error:
          "Grading Intensity (Row 3) must be one of: Basic, Professional, Advanced, Technical",
      };
    }

    const programsStr = String(programsRow[1] || "").trim();
    const programs = programsStr
      ? programsStr
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

    // Parse criteria from row 6 onwards (row index 5)
    const headerRow = rawData[5] as unknown[]; // Row 6
    if (!headerRow || headerRow.length < 3) {
      return {
        success: false,
        error:
          "Row 6 must contain column headers (Criterion, Score Level 1, Points 1, etc.)",
      };
    }

    // Find criterion column index
    let criterionColIndex = 0;
    for (let i = 0; i < headerRow.length; i++) {
      const header = String(headerRow[i] || "").toLowerCase();
      if (
        header.includes("criterion") ||
        header.includes("criteria") ||
        header.includes("title")
      ) {
        criterionColIndex = i;
        break;
      }
    }

    // Find score level columns (pattern: title, points, description, title, points, description...)
    const scoreColumns: Array<{
      titleIndex: number;
      pointsIndex: number;
      descriptionIndex: number;
    }> = [];

    // First try pattern with descriptions (title, points, description)
    for (let i = criterionColIndex + 1; i < headerRow.length; i += 3) {
      const titleIndex = i;
      const pointsIndex = i + 1;
      const descriptionIndex = i + 2;
      if (titleIndex < headerRow.length) {
        scoreColumns.push({ titleIndex, pointsIndex, descriptionIndex });
      }
    }

    // Fallback: if no descriptions found, try pattern without descriptions (title, points, title, points...)
    if (scoreColumns.length === 0) {
      for (let i = criterionColIndex + 1; i < headerRow.length; i += 2) {
        const titleIndex = i;
        const pointsIndex = i + 1;
        if (titleIndex < headerRow.length) {
          scoreColumns.push({ titleIndex, pointsIndex, descriptionIndex: -1 });
        }
      }
    }

    if (scoreColumns.length === 0) {
      return {
        success: false,
        error:
          "Could not find score level columns. Expected format: Criterion | Score Level 1 | Points 1 | Description 1 | Score Level 2 | Points 2 | Description 2 | ...",
      };
    }

    // Parse criteria rows (starting from row 7, index 6)
    const parsedCriteria: CriteriaRow[] = [];
    for (let i = 6; i < rawData.length; i++) {
      const row = rawData[i] as unknown[];
      if (!row || row.length === 0) continue;

      const criterionTitle = String(row[criterionColIndex] || "").trim();
      if (!criterionTitle) continue; // Skip empty rows

      const scores: ScoreLevel[] = [];
      scoreColumns.forEach((col, idx) => {
        const title = String(row[col.titleIndex] || "").trim();
        const pointsStr =
          col.pointsIndex < row.length
            ? String(row[col.pointsIndex] || "").trim()
            : "";
        const points = pointsStr
          ? parseInt(pointsStr, 10)
          : scoreColumns.length - idx;
        const description =
          col.descriptionIndex >= 0 && col.descriptionIndex < row.length
            ? String(row[col.descriptionIndex] || "").trim()
            : "";

        if (title && !isNaN(points)) {
          scores.push({
            id: String(idx + 1),
            title,
            points: points || scoreColumns.length - idx,
            description: description || "",
          });
        }
      });

      if (scores.length > 0) {
        parsedCriteria.push({
          id: String(parsedCriteria.length + 1),
          title: criterionTitle,
          scores,
        });
      }
    }

    if (parsedCriteria.length === 0) {
      return {
        success: false,
        error:
          "No valid criteria found in the Excel file. Please check that criteria rows start from row 7.",
      };
    }

    return {
      success: true,
      rubric: {
        name,
        description,
        gradingIntensity:
          gradingIntensity as ImportedRubric["gradingIntensity"],
        programs,
        criteria: parsedCriteria,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to parse Excel file",
    };
  }
}

/**
 * Download an Excel template file for rubric import
 */
export async function downloadRubricExcelTemplate() {
  try {
    const XLSX = await import("xlsx");

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create data array
    const data = [
      ["Rubric Name", "My Essay Rubric"],
      ["Description", "A rubric for evaluating student essays"],
      ["Grading Intensity", "Basic"],
      ["Programs", "Computer Science, Engineering"],
      [""], // Empty row
      [
        "Criterion",
        "Score Level 1",
        "Points 1",
        "Description 1",
        "Score Level 2",
        "Points 2",
        "Description 2",
        "Score Level 3",
        "Points 3",
        "Description 3",
        "Score Level 4",
        "Points 4",
        "Description 4",
      ],
      [
        "Grammar & Mechanics",
        "Excellent",
        "4",
        "Virtually no errors; demonstrates mastery of grammar and mechanics",
        "Proficient",
        "3",
        "Few minor errors; strong command of grammar",
        "Developing",
        "2",
        "Some errors that don't impede understanding",
        "Beginning",
        "1",
        "Frequent errors that significantly impact readability",
      ],
      [
        "Organization & Structure",
        "Excellent",
        "4",
        "Clear, logical structure with smooth transitions",
        "Proficient",
        "3",
        "Generally organized with some minor flow issues",
        "Developing",
        "2",
        "Basic structure but lacks coherence",
        "Beginning",
        "1",
        "Disorganized and difficult to follow",
      ],
      [
        "Argument Strength",
        "Excellent",
        "4",
        "Compelling argument with strong evidence and clear reasoning",
        "Proficient",
        "3",
        "Solid argument with adequate evidence",
        "Developing",
        "2",
        "Weak argument with limited evidence",
        "Beginning",
        "1",
        "No clear argument or evidence provided",
      ],
    ];

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 25 }, // Criterion column
      { wch: 15 }, // Score Level 1
      { wch: 8 }, // Points 1
      { wch: 50 }, // Description 1
      { wch: 15 }, // Score Level 2
      { wch: 8 }, // Points 2
      { wch: 50 }, // Description 2
      { wch: 15 }, // Score Level 3
      { wch: 8 }, // Points 3
      { wch: 50 }, // Description 3
      { wch: 15 }, // Score Level 4
      { wch: 8 }, // Points 4
      { wch: 50 }, // Description 4
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rubric");

    // Generate Excel file
    XLSX.writeFile(workbook, "rubric-template.xlsx");
  } catch (error) {
    console.error("Error generating Excel template:", error);
    throw new Error("Failed to generate Excel template");
  }
}

/**
 * Download a template JSON file for rubric import
 */
export function downloadRubricTemplate() {
  const template: ImportedRubric = {
    name: "Sample Essay Rubric",
    description: "A sample rubric for evaluating essays",
    gradingIntensity: "Basic",
    programs: ["Computer Science", "Engineering"],
    criteria: [
      {
        id: '1',
        title: "Grammar & Mechanics",
        scores: [
          {
            id: '1',
            title: "Excellent",
            points: 4,
            description:
              "Virtually no errors; demonstrates mastery of grammar and mechanics",
          },
          {
            id: '2',
            title: "Proficient",
            points: 3,
            description: "Few minor errors; strong command of grammar",
          },
          {
            id: '3',
            title: "Developing",
            points: 2,
            description: "Some errors that don't impede understanding",
          },
          {
            id: '4',
            title: "Beginning",
            points: 1,
            description:
              "Frequent errors that significantly impact readability",
          },
        ],
      },
      {
        id: '2',
        title: "Organization & Structure",
        scores: [
          {
            id: '1',
            title: "Excellent",
            points: 4,
            description: "Clear, logical structure with smooth transitions",
          },
          {
            id: '2',
            title: "Proficient",
            points: 3,
            description: "Generally organized with some minor flow issues",
          },
          {
            id: '3',
            title: "Developing",
            points: 2,
            description: "Basic structure but lacks coherence",
          },
          {
            id: '4',
            title: "Beginning",
            points: 1,
            description: "Disorganized and difficult to follow",
          },
        ],
      },
    ],
  };

  const blob = new Blob([JSON.stringify(template, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rubric-template.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
