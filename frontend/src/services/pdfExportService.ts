import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PDFExportOptions {
  fileName: string;
  onProgress?: (loading: boolean) => void;
  footerText?: string;
  scale?: number;
}

/**
 * Generates a native vector-based PDF with selectable text for an essay transcript.
 * Follows a professional two-page spread layout.
 */
export const exportTranscriptNative = async (data: any) => {
  const { essay, analysis, scores } = data;
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Load Logo
  const logoUrl = "/EduCompose.png";
  
  const addHeader = (pageNum: number) => {
    pdf.setPage(pageNum);
    // Logo and Brand
    try {
        pdf.addImage(logoUrl, 'PNG', margin, 15, 8, 8);
    } catch (e) {
        console.warn("Logo not found at /EduCompose.png, skipping image header");
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(80, 150, 200); // Light blue accent
    pdf.text("EduCompose", margin + 11, 21.5);

    // Student Name (Upper Left)
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    const student = (essay as any)?.student;
    const studentName = student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : "Guest Student";
    pdf.text(`Student: ${studentName}`, margin, 30);
  };

  // --- PAGE 1: EVALUATION ---
  addHeader(1);

  // Essay Title (Centered, Bold, No Brackets)
  let currentY = 40;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(30, 41, 59);
  pdf.text(essay?.essay_activities?.title || essay?.title || "Untitled Essay", pageWidth / 2, currentY, { align: 'center' });

  // Metrics (Left) & Grade Box (Right)
  currentY += 15;
  const metricsY = currentY;
  pdf.setFontSize(10);
  const metrics = [
    { label: "Grammar :", val: scores.grammar, color: [220, 38, 38] },
    { label: "Readability :", val: scores.readability, color: [5, 150, 105] },
    { label: "Coherence :", val: scores.coherence, color: [2, 132, 199] },
    { label: "Argument :", val: scores.argument_strength, color: [124, 58, 237] }
  ];

  metrics.forEach((m, i) => {
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(80, 80, 80);
    pdf.text(m.label, margin, metricsY + (i * 7));
    pdf.setTextColor(m.color[0], m.color[1], m.color[2]);
    pdf.text(`${Math.round(m.val)}%`, margin + 25, metricsY + (i * 7));
  });

  // Grade Box (Right) - Premium Design
  const boxW = 40;
  const boxH = 32;
  const boxX = pageWidth - margin - boxW;
  const boxY = metricsY - 6;

  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.1);
  pdf.setFillColor(250, 250, 250);
  pdf.roundedRect(boxX, boxY, boxW, boxH, 4, 4, 'FD'); // Background
  
  pdf.setDrawColor(30, 41, 59);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(boxX + 1.5, boxY + 1.5, boxW - 3, boxH - 3, 3, 3, 'S'); // Inner Border
  
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(26);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${Math.round(scores.overall)}`, boxX + (boxW / 2), boxY + 18, { align: 'center' });
  
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(100, 100, 100);
  pdf.text("OVERALL GRADE", boxX + (boxW / 2), boxY + 26, { align: 'center' });

  // Essay Manuscript Section (Paragraph Form)
  currentY = metricsY + 42;
  pdf.setFillColor(240, 245, 255);
  pdf.roundedRect(margin, currentY - 5, 45, 8, 2, 2, 'F');
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 41, 59);
  pdf.text("Essay Manuscript", margin + 3, currentY + 1);

  currentY += 12;
  pdf.setFontSize(10);
  pdf.setFont("times", "normal");
  pdf.setTextColor(50, 50, 50);
  
  const manuscriptRaw = (analysis?.original_text || "").replace(/\n+/g, ' ').trim();
  const words = manuscriptRaw.split(' ');
  let line: string[] = [];
  let lineLength = 0;

  words.forEach((word: string) => {
    const wordWidth = pdf.getTextWidth(word + ' ');
    if (lineLength + wordWidth > contentWidth) {
      // Justify and draw the line
      const totalWordWidth = line.reduce((acc: number, w: string) => acc + pdf.getTextWidth(w), 0);
      const totalSpaceWidth = contentWidth - totalWordWidth;
      const spaceWidth = line.length > 1 ? totalSpaceWidth / (line.length - 1) : 0;
      
      let xCoord = margin;
      line.forEach((w: string, i: number) => {
        pdf.text(w, xCoord, currentY);
        xCoord += pdf.getTextWidth(w) + (line.length > 1 && i < line.length - 1 ? spaceWidth : 0);
      });
      
      currentY += 6;
      if (currentY > pageHeight - 30) {
        pdf.addPage();
        addHeader(pdf.getNumberOfPages());
        currentY = 40;
      }
      
      line = [word];
      lineLength = wordWidth;
    } else {
      line.push(word);
      lineLength += wordWidth;
    }
  });

  // Draw the last line (left aligned)
  pdf.text(line.join(' '), margin, currentY);
  currentY += 6;

  // Page break if needed before diagnostics
  if (currentY > pageHeight - 80) {
      pdf.addPage();
      addHeader(pdf.getNumberOfPages());
      currentY = 40;
  }

  // Grammar Diagnostics
  currentY += 12;
  pdf.setDrawColor(240, 240, 240);
  pdf.line(margin, currentY - 6, pageWidth - margin, currentY - 6);
  
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 41, 59);
  pdf.text("Grammar Diagnostics", margin, currentY);

  currentY += 10;
  const grammarErrors = analysis?.detailed_analysis?.grammar?.errors || [];
  if (grammarErrors.length > 0) {
      const errorTypes = [...new Set(grammarErrors.map((e: any) => e.type || 'Grammar'))];
      errorTypes.slice(0, 3).forEach(type => {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(180, 50, 50);
          pdf.text(`${type} (${grammarErrors.filter((e: any) => (e.type || 'Grammar') === type).length})`, margin + 5, currentY);
          currentY += 5;
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 100, 100);
          pdf.setFontSize(8);
          const typeErrors = grammarErrors.filter((e: any) => (e.type || 'Grammar') === type);
          typeErrors.slice(0, 2).forEach((err: any) => {
              pdf.text(`• ${err.message}`, margin + 10, currentY);
              currentY += 5;
          });
          currentY += 4;
      });
  } else {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(150, 150, 150);
      pdf.text("No diagnostic anomalies detected.", margin + 5, currentY);
      currentY += 10;
  }

  // Feedback Summary
  currentY += 6;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 41, 59);
  pdf.text("Feedback Summary", margin, currentY);
  
  currentY += 10;
  // Strength Box
  pdf.setFillColor(240, 253, 244);
  pdf.roundedRect(margin + 5, currentY - 4, contentWidth - 10, 12, 2, 2, 'F');
  pdf.setTextColor(21, 128, 61);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("KEY STRENGTH:", margin + 10, currentY + 3);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(50, 50, 50);
  pdf.text(analysis?.diagnostic_summary?.strengths?.[0] || "Strong linguistic execution detected.", margin + 38, currentY + 3);
  
  currentY += 16;
  // Opportunity Box
  pdf.setFillColor(255, 251, 235);
  pdf.roundedRect(margin + 5, currentY - 4, contentWidth - 10, 12, 2, 2, 'F');
  pdf.setTextColor(180, 83, 9);
  pdf.setFont("helvetica", "bold");
  pdf.text("OPPORTUNITY:", margin + 10, currentY + 3);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(50, 50, 50);
  pdf.text(analysis?.diagnostic_summary?.weaknesses?.[0] || "Consider expanding on evidentiary grounds.", margin + 38, currentY + 3);

  // --- PAGE 2: ANALYSIS & VISUALIZATION ---
  pdf.addPage();
  addHeader(pdf.getNumberOfPages());

  currentY = 40;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(30, 41, 59);
  pdf.text("Argument Architecture", margin, currentY);

  // Argument Strength Section
  currentY += 10;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 41, 59);
  pdf.text("Argument Strength", margin, currentY);
  
  currentY += 8;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text(analysis?.detailed_analysis?.argumentation?.metrics?.strength_analysis || "Computational analysis evaluating the logical connectivity and evidentiary support of each claim.", margin, currentY, { maxWidth: contentWidth });

  // Evidence Verification
  currentY += 18;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Evidence Verification", margin, currentY);
  
  currentY += 10;
  // Try multiple paths for evidence data - prioritising 'verification'
  const argMetrics = analysis?.detailed_analysis?.argumentation?.metrics;
  const evidenceList = 
    argMetrics?.verification || 
    argMetrics?.evidence_verification || 
    analysis?.detailed_analysis?.evidence_verification || 
    [];

  if (evidenceList.length > 0) {
      evidenceList.slice(0, 10).forEach((item: any) => {
          if (currentY > pageHeight - 40) {
              pdf.addPage();
              addHeader(pdf.getNumberOfPages());
              currentY = 40;
          }
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 100, 100);
          
          // The system uses 'statement' and 'status'
          const rawStatement = item.statement || item.text || "Structural support statement";
          const statement = rawStatement.replace(/\n+/g, ' ').trim();
          const status = item.status || "Verified";
          
          const truncated = statement.length > 85 ? statement.substring(0, 82) + "..." : statement;
          pdf.text(`" ${truncated} "`, margin + 2, currentY);
          
          if (status === "Verified") {
              pdf.setTextColor(16, 185, 129);
          } else {
              pdf.setTextColor(245, 158, 11);
          }
          pdf.setFont("helvetica", "bold");
          pdf.text(status, pageWidth - margin, currentY, { align: 'right' });
          currentY += 6;
      });
  } else {
      pdf.setFont("helvetica", "italic");
      pdf.text("None Detected", margin + 2, currentY);
      currentY += 10;
  }

  // Academic Integrity Section - Cards Design
  currentY += 15;
  pdf.setDrawColor(240, 240, 240);
  pdf.line(margin, currentY - 5, pageWidth - margin, currentY - 5);
  
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 41, 59);
  pdf.text("Academic Integrity & Protocols", margin, currentY);
  
  currentY += 10;
  const cardW = (contentWidth / 2) - 5;
  
  // AI Score Card
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, currentY, cardW, 20, 2, 2, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text("AI DETECTION SCORE", margin + 5, currentY + 7);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 41, 59);
  const aiScore = analysis?.ai_detection?.ai_score;
  pdf.text(aiScore !== undefined ? `${aiScore}%` : "None", margin + 5, currentY + 15);
  
  // Plagiarism Index Card
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin + cardW + 10, currentY, cardW, 20, 2, 2, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text("PLAGIARISM INDEX", margin + cardW + 15, currentY + 7);
  pdf.setFontSize(14);
  pdf.setTextColor(30, 41, 59);
  const plagiarismPercent = analysis?.plagiarism?.plagiarism_percentage;
  pdf.text(plagiarismPercent !== undefined ? `${plagiarismPercent}%` : "None", margin + cardW + 15, currentY + 15);

  // Plagiarism Links (Clickable)
  const pSources = analysis?.plagiarism?.sources || [];
  if (pSources.length > 0) {
      currentY += 28;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("Referenced Sources:", margin, currentY);
      currentY += 6;
      pSources.slice(0, 3).forEach((source: any) => {
          if (currentY > pageHeight - 20) return;
          pdf.setTextColor(2, 132, 199);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          const sourceText = source.url || source.title || "External Source";
          pdf.textWithLink(`• ${sourceText.substring(0, 90)}`, margin + 5, currentY, { url: source.url });
          currentY += 5;
      });
  }

  // --- GLOBAL FOOTER ---
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(180, 180, 180);
    pdf.setFont("helvetica", "italic");
    const footerText = "Official EduCompose Diagnostic Certificate";
    pdf.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  pdf.save(`EduCompose_Report_${essay?.id?.substring(0, 8)}.pdf`);
};

export const exportElementToPDF = async (
  element: HTMLElement | null,
  options: PDFExportOptions
) => {
  if (!element) return;

  try {
    if (options.onProgress) options.onProgress(true);

    // Create a high-quality canvas
    const canvas = await html2canvas(element, {
      scale: options.scale || 3,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff"
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgProps = pdf.getImageProperties(imgData);
    const totalContentHeightInMm = (imgProps.height * pdfWidth) / imgProps.width;
    
    let heightLeft = totalContentHeightInMm;
    let position = 0;

    // Page 1
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalContentHeightInMm);
    heightLeft -= pdfHeight;

    // Subsequent pages
    while (heightLeft > 0) {
      position = heightLeft - totalContentHeightInMm;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalContentHeightInMm);
      heightLeft -= pdfHeight;
    }

    // Add footer to each page
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      if (options.footerText) {
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `${options.footerText} - Page ${i} of ${totalPages}`,
          pdfWidth / 2,
          pdfHeight - 10,
          { align: 'center' }
        );
      }
    }

    pdf.save(`${options.fileName}.pdf`);
  } catch (err) {
    console.error("PDF Export Error:", err);
    throw err;
  } finally {
    if (options.onProgress) options.onProgress(false);
  }
};
