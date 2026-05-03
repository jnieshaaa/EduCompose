// ============================================================
// academicReportTemplate.ts
// Generates a professional HTML string for the Academic Records
// PDF report. Opened in a new window and printed by the browser.
// ============================================================

export interface ReportData {
  ay: string;
  term: string;
  totalCourses: number;
  totalUnits: number;
  activeTeacherCount: number;
  inactiveTeacherCount: number;
  groupedTeachers: Array<{
    teacher: {
      first_name?: string;
      last_name?: string;
      email?: string;
      title?: string | null;
    } | null;
    courses: Array<{
      courses?: {
        course_code?: string;
        course_title?: string;
        units?: number;
      };
    }>;
  }>;
  blockStudents: Array<{
    name: string;
    year: number;
    block_students?: Array<{
      users?: {
        first_name?: string;
        last_name?: string;
        is_active?: boolean;
      };
    }>;
  }>;
}

// ── Partial HTML builders ────────────────────────────────────

function buildTeacherRows(groupedTeachers: ReportData["groupedTeachers"]): string {
  if (groupedTeachers.length === 0) {
    return `<p class="empty">No teacher records for this period.</p>`;
  }
  return groupedTeachers
    .map((g) => {
      const coursesList = g.courses
        .map(
          (c) =>
            `<tr>
              <td>${c.courses?.course_code || "—"}</td>
              <td>${c.courses?.course_title || "—"}</td>
              <td class="center">${c.courses?.units ?? 0}</td>
            </tr>`
        )
        .join("");

      return `
        <div class="teacher-block">
          <div class="teacher-name">
            ${g.teacher?.first_name || ""} ${g.teacher?.last_name || ""}
            ${g.teacher?.title ? `<span class="tag">${g.teacher.title}</span>` : ""}
          </div>
          <div class="sub">${g.teacher?.email || ""}</div>
          <table>
            <thead>
              <tr><th>Code</th><th>Course Title</th><th>Units</th></tr>
            </thead>
            <tbody>${coursesList}</tbody>
          </table>
        </div>`;
    })
    .join("");
}

function buildBlockRows(blockStudents: ReportData["blockStudents"]): string {
  const rendered = blockStudents
    .map((block) => {
      const students = block.block_students || [];
      if (students.length === 0) return "";
      const rows = students
        .map((bs) => {
          const u = bs.users;
          const status = u?.is_active ? "Active" : "Inactive";
          const statusClass = u?.is_active ? "badge-active" : "badge-inactive";
          return `<tr>
            <td>${u?.first_name || ""} ${u?.last_name || ""}</td>
            <td><span class="${statusClass}">${status}</span></td>
          </tr>`;
        })
        .join("");

      return `
        <div class="block-section">
          <div class="block-title">
            Block: <strong>${block.name}</strong> &mdash; Year ${block.year}
            <span class="block-count">${students.length} student${students.length !== 1 ? "s" : ""}</span>
          </div>
          <table>
            <thead><tr><th>Student Name</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    })
    .filter(Boolean)
    .join("");

  return rendered || `<p class="empty">No block or student records found.</p>`;
}

// ── CSS ──────────────────────────────────────────────────────

const REPORT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', sans-serif;
    color: #1e293b;
    background: #fff;
    padding: 48px;
    font-size: 12px;
    line-height: 1.5;
  }

  /* ── Header ── */
  .report-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border-bottom: 3px solid #0d9488;
    padding-bottom: 20px;
    margin-bottom: 28px;
  }
  .logo-area { display: flex; flex-direction: column; gap: 4px; }
  .school-name {
    font-size: 9px; font-weight: 700; letter-spacing: 0.22em;
    text-transform: uppercase; color: #0d9488;
  }
  .report-title { font-size: 24px; font-weight: 700; color: #0f172a; }

  .meta-grid { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .meta-item { text-align: right; }
  .meta-item label {
    font-size: 8px; font-weight: 600; letter-spacing: 0.15em;
    text-transform: uppercase; color: #94a3b8; display: block;
  }
  .meta-item span { font-size: 12px; font-weight: 600; color: #0f172a; }

  /* ── Summary stats ── */
  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin: 24px 0 32px;
  }
  .stat {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 16px;
  }
  .stat label {
    font-size: 8px; font-weight: 600; letter-spacing: 0.15em;
    text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 6px;
  }
  .stat span { font-size: 22px; font-weight: 700; color: #0f172a; }
  .stat.accent span { color: #0d9488; }
  .stat.warn span { color: #f59e0b; }

  /* ── Section title ── */
  .section-title {
    font-size: 9px; font-weight: 700; letter-spacing: 0.22em;
    text-transform: uppercase; color: #0d9488;
    margin: 32px 0 14px;
    padding-bottom: 8px;
    border-bottom: 1.5px solid #e2e8f0;
    display: flex; align-items: center; gap: 8px;
  }
  .section-title::before {
    content: '';
    display: inline-block;
    width: 6px; height: 6px;
    background: #0d9488;
    border-radius: 50%;
  }

  /* ── Teacher blocks ── */
  .teacher-block {
    margin-bottom: 18px;
    background: #f8fafc;
    border-radius: 10px;
    padding: 16px 18px;
    border: 1px solid #e2e8f0;
    break-inside: avoid;
  }
  .teacher-name { font-size: 14px; font-weight: 600; color: #0f172a; }
  .tag {
    font-size: 9px; background: #ccfbf1; color: #0d9488;
    border-radius: 4px; padding: 2px 7px; margin-left: 8px;
    font-weight: 600; letter-spacing: 0.1em; vertical-align: middle;
  }
  .sub { font-size: 10px; color: #94a3b8; margin: 3px 0 12px; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
  th {
    background: #f1f5f9; font-size: 8px; font-weight: 700;
    letter-spacing: 0.15em; text-transform: uppercase; color: #64748b;
    padding: 8px 10px; text-align: left;
  }
  td { padding: 8px 10px; color: #334155; border-bottom: 1px solid #f1f5f9; }
  td.center { text-align: center; }

  /* ── Block sections ── */
  .block-section { margin-bottom: 18px; break-inside: avoid; }
  .block-title {
    font-size: 12px; font-weight: 600; color: #0f172a;
    margin-bottom: 8px; display: flex; align-items: center; gap: 10px;
  }
  .block-count {
    font-size: 9px; color: #94a3b8; font-weight: 500;
    background: #f1f5f9; border-radius: 20px; padding: 2px 8px;
  }

  /* ── Badges ── */
  .badge-active {
    font-size: 9px; font-weight: 600; background: #dcfce7;
    color: #16a34a; border-radius: 4px; padding: 2px 7px;
    text-transform: uppercase; letter-spacing: 0.1em;
  }
  .badge-inactive {
    font-size: 9px; font-weight: 600; background: #fee2e2;
    color: #dc2626; border-radius: 4px; padding: 2px 7px;
    text-transform: uppercase; letter-spacing: 0.1em;
  }

  /* ── Footer ── */
  .report-footer {
    margin-top: 48px; padding-top: 14px;
    border-top: 1px solid #e2e8f0;
    font-size: 9px; color: #94a3b8;
    display: flex; justify-content: space-between; align-items: center;
  }

  /* ── Utility ── */
  .empty { color: #94a3b8; font-size: 11px; font-style: italic; padding: 8px 0; }

  @media print {
    body { padding: 24px; }
    .teacher-block, .block-section { break-inside: avoid; }
  }
`;

// ── Main export ──────────────────────────────────────────────

export function generateAcademicReportHTML(data: ReportData): string {
  const {
    ay, term,
    totalCourses, totalUnits,
    activeTeacherCount, inactiveTeacherCount,
    groupedTeachers, blockStudents,
  } = data;

  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const teacherRows = buildTeacherRows(groupedTeachers);
  const blockRows = buildBlockRows(blockStudents);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Academic Report &mdash; AY ${ay} &mdash; ${term}</title>
  <style>${REPORT_STYLES}</style>
</head>
<body>

  <div class="report-header">
    <div class="logo-area">
      <span class="school-name">EduCompose &mdash; Academic Report</span>
      <h1 class="report-title">Academic Records</h1>
    </div>
    <div class="meta-grid">
      <div class="meta-item">
        <label>Academic Year</label>
        <span>AY ${ay}</span>
      </div>
      <div class="meta-item">
        <label>Semester / Term</label>
        <span>${term}</span>
      </div>
      <div class="meta-item">
        <label>Generated</label>
        <span>${generatedDate}</span>
      </div>
    </div>
  </div>

  <div class="summary">
    <div class="stat">
      <label>Total Courses</label>
      <span>${totalCourses}</span>
    </div>
    <div class="stat">
      <label>Total Units</label>
      <span>${totalUnits}</span>
    </div>
    <div class="stat accent">
      <label>Active Teachers</label>
      <span>${activeTeacherCount}</span>
    </div>
    <div class="stat warn">
      <label>Inactive Teachers</label>
      <span>${inactiveTeacherCount}</span>
    </div>
  </div>

  <div class="section-title">Teacher Assignments</div>
  ${teacherRows}

  <div class="section-title">Students by Block</div>
  ${blockRows}

  <div class="report-footer">
    <span>EduCompose Platform &mdash; Confidential &mdash; For Internal Use Only</span>
    <span>Generated ${generatedDate}</span>
  </div>

</body>
</html>`;
}
