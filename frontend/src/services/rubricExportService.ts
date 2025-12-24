import type { PlatformRubric, CriteriaRow } from "../components/rubrics/types";

/**
 * Export rubric to PDF format
 */
export async function exportRubricToPDF(rubric: PlatformRubric): Promise<void> {
  try {
    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();

    // Set up fonts and colors
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = margin;

    // Helper function to add a new page if needed
    const checkNewPage = (requiredSpace: number) => {
      if (yPos + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPos = margin;
      }
    };

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(rubric.name, pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Description
    if (rubric.description) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const descriptionLines = doc.splitTextToSize(
        rubric.description,
        pageWidth - 2 * margin
      );
      doc.text(descriptionLines, margin, yPos);
      yPos += descriptionLines.length * 6 + 5;
    }

    // Type/Intensity
    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.text(`Grading Intensity: ${rubric.type}`, margin, yPos);
    yPos += 8;

    // Criteria
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Criteria", margin, yPos);
    yPos += 8;

    rubric.criteria.forEach((criterion: CriteriaRow, index: number) => {
      checkNewPage(30);

      // Criterion title
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${criterion.title}`, margin, yPos);
      yPos += 7;

      // Score levels
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      criterion.scores.forEach((score) => {
        checkNewPage(15);

        // Score title and points
        doc.setFont("helvetica", "bold");
        const scoreText = `${score.title} (${score.points} points)`;
        doc.text(scoreText, margin + 5, yPos);
        yPos += 5;

        // Score description
        if (score.description) {
          doc.setFont("helvetica", "normal");
          const descLines = doc.splitTextToSize(
            score.description,
            pageWidth - 2 * margin - 10
          );
          doc.text(descLines, margin + 10, yPos);
          yPos += descLines.length * 5 + 3;
        } else {
          yPos += 3;
        }
      });

      yPos += 5; // Space between criteria
    });

    // Save PDF
    const fileName = `${rubric.name.replace(/[^a-z0-9]/gi, "_")}_rubric.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error("Error exporting rubric to PDF:", error);
    throw new Error("Failed to export rubric to PDF");
  }
}

/**
 * Export rubric to Excel format
 */
export async function exportRubricToExcel(rubric: PlatformRubric): Promise<void> {
  try {
    const XLSX = await import("xlsx");

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Prepare data array
    const data: unknown[][] = [
      ["Rubric Name", rubric.name],
      ["Description", rubric.description || ""],
      ["Grading Intensity", rubric.type],
      ["Programs", ""], // Programs not in PlatformRubric type
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
    ];

    // Add criteria rows
    rubric.criteria.forEach((criterion: CriteriaRow) => {
      const row: unknown[] = [criterion.title];

      // Add score levels (up to 4 levels)
      for (let i = 0; i < 4; i++) {
        const score = criterion.scores[i];
        if (score) {
          row.push(score.title);
          row.push(score.points.toString());
          row.push(score.description || "");
        } else {
          // Fill empty cells if less than 4 score levels
          row.push("");
          row.push("");
          row.push("");
        }
      }

      data.push(row);
    });

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
    const fileName = `${rubric.name.replace(/[^a-z0-9]/gi, "_")}_rubric.xlsx`;
    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    console.error("Error exporting rubric to Excel:", error);
    throw new Error("Failed to export rubric to Excel");
  }
}

