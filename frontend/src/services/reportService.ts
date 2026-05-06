import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '../lib/supabaseClient';
import type { Section, Course } from '../types/academic';
import logoUrl from '../assets/EduCompose.png';

interface ReportData {
  student_code: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  department: string;
  program: string;
  year: number;
  block: string;
  activity_count: number;
  avg_coh: number;
  avg_read: number;
  avg_arg: number;
  avg_grm: number;
  avg_overall: number;
}

export const reportService = {
  /**
   * Fetches data and generates an Excel report for a specific class/section
   */
  async generateClassReport(section: Section, course: Course, schoolYear: string) {
    try {
      console.log("Starting report generation for section:", section.id);
      
      // 1. Fetch students in this block via users table join
      const { data: users, error: studentError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          middle_name,
          last_name,
          email,
          student_profiles!inner (
            student_code,
            year,
            block_name,
            programs_lookup (
              name,
              abbr,
              departments (
                name
              )
            )
          ),
          block_students!inner (
            block_id
          )
        `)
        .eq('role', 'student')
        .eq('block_students.block_id', section.block_id);

      if (studentError) {
        console.error("Student fetch error:", studentError);
        throw studentError;
      }
      
      if (!users || users.length === 0) {
        console.warn("No students found for block_id:", section.block_id);
        throw new Error("No students found in this section.");
      }

      console.log(`Found ${users.length} students. Fetching essays...`);

      // 2. Fetch submissions for all these students
      const studentIds = users.map(u => u.id);
      
      // Fetch all essays to get activity count
      const { data: allEssays, error: allEssaysError } = await supabase
        .from('essays')
        .select('id, student_id, status')
        .in('student_id', studentIds);

      if (allEssaysError) throw allEssaysError;

      // Fetch analysis results for scores
      const analyzedEssayIds = allEssays?.filter(e => e.status === 'analyzed' || e.status === 'reviewed').map(e => e.id) || [];
      
      let analysisMap = new Map();
      if (analyzedEssayIds.length > 0) {
        const { data: analysisData } = await supabase
          .from('essay_analysis_results')
          .select('essay_id, coherence_score, readability_score, argument_strength_score, grammar_score, overall_score')
          .in('essay_id', analyzedEssayIds);
        
        analysisData?.forEach(row => {
          analysisMap.set(row.essay_id, row);
        });
      }

      console.log(`Found ${allEssays?.length || 0} total submissions, ${analyzedEssayIds.length} with analysis results.`);

      // 3. Process data
      const reportData: ReportData[] = users.map(u => {
        const studentEssays = allEssays?.filter(e => e.student_id === u.id) || [];
        const activityCount = studentEssays.length;
        
        const gradedEssays = studentEssays
          .filter(e => analysisMap.has(e.id))
          .map(e => analysisMap.get(e.id));
        
        const gradedCount = gradedEssays.length;

        const sp = Array.isArray(u.student_profiles) ? u.student_profiles[0] : u.student_profiles;

        const avg = (key: string) => {
          if (gradedCount === 0) return 0;
          const sum = gradedEssays.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
          return Number((sum / gradedCount).toFixed(2));
        };

        return {
          student_code: sp?.student_code || 'N/A',
          first_name: u.first_name,
          middle_name: (u as any).middle_name || (sp as any)?.middle_name || '',
          last_name: u.last_name,
          email: u.email,
          department: (sp?.programs_lookup as any)?.departments?.[0]?.name || course.departments?.name || '',
          program: (sp?.programs_lookup as any)?.abbr || (sp?.programs_lookup as any)?.name || '',
          year: sp?.year || 1,
          block: sp?.block_name || '',
          activity_count: activityCount,
          avg_coh: avg('coherence_score'),
          avg_read: avg('readability_score'),
          avg_arg: avg('argument_strength_score'),
          avg_grm: avg('grammar_score'),
          avg_overall: avg('overall_score')
        };
      });

      await createExcelFile(reportData, section, course, schoolYear);

      return { success: true };
    } catch (error: any) {
      console.error("Report Generation Error:", error);
      return { success: false, error: error.message };
    }
  }
};

async function createExcelFile(data: ReportData[], section: Section, course: Course, schoolYear: string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Class Report');

  // Colors
  const AQUA_LIGHT = 'FFB2E2E2'; // Aqua, Accent 5, Lighter 60%
  const BLUE_LIGHT = 'FFDDEBF7'; // Blue, Accent 1, Lighter 80%
  const WHITE = 'FFFFFFFF';
  const BLACK = 'FF000000';

  // Set all header area to White by default (clean look)
  for (let i = 1; i <= 5; i++) {
    const row = worksheet.getRow(i);
    for (let j = 1; j <= 14; j++) {
      row.getCell(j).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: WHITE }
      };
    }
  }

  // Logo Area (D2:D4) - No background color or borders
  worksheet.mergeCells('D2:D4');
  const logoCell = worksheet.getCell('D2');
  logoCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add Logo Image
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const imageId = workbook.addImage({
      buffer: arrayBuffer,
      extension: 'png',
    });
    worksheet.addImage(imageId, {
      tl: { col: 3.3, row: 1.3 } as any, 
      ext: { width: 55, height: 50 }
    });
  } catch (err) {
    console.error("Failed to load logo for excel:", err);
    logoCell.value = 'LOGO HERE';
    logoCell.font = { color: { argb: BLACK }, bold: true };
  }

  // Title Area (E2:K3)
  worksheet.mergeCells('E2:K3');
  const titleCell = worksheet.getCell('E2');
  titleCell.value = 'EDUCOMPOSE CLASS REPORT';
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: AQUA_LIGHT }
  };
  titleCell.font = { name: 'Arial Black', size: 16, bold: true, color: { argb: BLACK } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.border = {
    top: { style: 'thin', color: { argb: BLACK } },
    left: { style: 'thin', color: { argb: BLACK } },
    bottom: { style: 'thin', color: { argb: BLACK } },
    right: { style: 'thin', color: { argb: BLACK } }
  };

  // Subtitle (E4:K4) - Academic Year
  worksheet.mergeCells('E4:K4');
  const subtitleCell = worksheet.getCell('E4');
  subtitleCell.value = `List Of Class - A.Y. ${schoolYear}`;
  subtitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: BLUE_LIGHT }
  };
  subtitleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: BLACK } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  subtitleCell.border = {
    top: { style: 'thin', color: { argb: BLACK } },
    left: { style: 'thin', color: { argb: BLACK } },
    bottom: { style: 'thin', color: { argb: BLACK } },
    right: { style: 'thin', color: { argb: BLACK } }
  };

  // Course Info (E5:K5)
  worksheet.mergeCells('E5:K5');
  const courseCell = worksheet.getCell('E5');
  courseCell.value = `${course.course_code}: ${course.course_title} (${section.year}${section.name})`;
  courseCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: BLACK } };
  courseCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Table Headers (Row 6)
  const headerRow = worksheet.getRow(6);
  headerRow.height = 20;
  const headers = [
    'student id', 'name', 'middle name', 'last name', 
    'email department', 'program', 'year', 'block',
    'activity', 'coh', 'read', 'arg', 'grm', 'overall grade'
  ];
  headerRow.values = headers;

  headers.forEach((_, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.font = { bold: true, size: 10, color: { argb: BLACK } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' } // Light Grey
    };
  });

  // Set column widths
  worksheet.columns = [
    { width: 15 }, { width: 20 }, { width: 15 }, { width: 20 },
    { width: 30 }, { width: 25 }, { width: 8 }, { width: 8 }, { width: 10 },
    { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 12 }
  ];

  // --- DATA ROWS ---
  data.forEach((item, index) => {
    const row = worksheet.getRow(7 + index);
    const rowValues = [
      item.student_code,
      item.first_name,
      item.middle_name,
      item.last_name,
      item.email,
      item.program,
      item.year,
      item.block,
      item.activity_count,
      item.avg_coh,
      item.avg_read,
      item.avg_arg,
      item.avg_grm,
      item.avg_overall
    ];

    rowValues.forEach((val, i) => {
      const cell = row.getCell(i + 1);
      cell.value = val;
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
      cell.alignment = { 
        horizontal: i >= 8 ? 'center' : 'left',
        vertical: 'middle' 
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `EduCompose_Report_${course.course_code}_${section.year}${section.name}.xlsx`);
}
