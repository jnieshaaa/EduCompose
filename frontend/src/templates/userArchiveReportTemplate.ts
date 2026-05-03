// ============================================================
// userArchiveReportTemplate.ts
// Generates a professional HTML string for the User Records Archive
// PDF report. Opened in a new window and printed by the browser.
// ============================================================

export interface UserArchiveReportData {
  totalRecords: number;
  studentRecords: number;
  teacherRecords: number;
  archivedUsers: Array<{
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
    is_active?: boolean;
    student_code?: string;
    enrollment_status?: string;
  }>;
}

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
    grid-template-columns: repeat(3, 1fr);
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

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
  th {
    background: #f1f5f9; font-size: 8px; font-weight: 700;
    letter-spacing: 0.15em; text-transform: uppercase; color: #64748b;
    padding: 8px 10px; text-align: left;
  }
  td { padding: 10px; color: #334155; border-bottom: 1px solid #f1f5f9; }
  
  .badge {
    font-size: 9px; font-weight: 600;
    border-radius: 4px; padding: 3px 8px;
    text-transform: uppercase; letter-spacing: 0.1em;
  }
  .badge-inactive { background: #fee2e2; color: #dc2626; }
  .badge-dropped { background: #ffedd5; color: #ea580c; }
  .badge-graduated { background: #dcfce7; color: #16a34a; }
  .badge-neutral { background: #f1f5f9; color: #64748b; }

  .role-label {
    font-weight: 600; text-transform: capitalize;
  }

  /* ── Footer ── */
  .report-footer {
    margin-top: 48px; padding-top: 14px;
    border-top: 1px solid #e2e8f0;
    font-size: 9px; color: #94a3b8;
    display: flex; justify-content: space-between; align-items: center;
  }

  .empty { color: #94a3b8; font-size: 11px; font-style: italic; padding: 8px 0; }

  @media print {
    body { padding: 24px; }
  }
`;

export function generateUserArchiveReportHTML(data: UserArchiveReportData): string {
  const { totalRecords, studentRecords, teacherRecords, archivedUsers } = data;
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  let rows = `<p class="empty">No historical records found.</p>`;
  
  if (archivedUsers.length > 0) {
    const tableBody = archivedUsers.map(user => {
      let statusClass = "badge-inactive";
      let statusText = "Deactivated";

      if (user.role === "student" && user.enrollment_status) {
        statusText = user.enrollment_status;
        if (statusText === "dropped") statusClass = "badge-dropped";
        if (statusText === "graduated") statusClass = "badge-graduated";
      }

      const idDisplay = user.student_code ? user.student_code : "—";
      const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();

      return `
        <tr>
          <td>${idDisplay}</td>
          <td style="font-weight:500; color:#0f172a;">${name}</td>
          <td>${user.email || "—"}</td>
          <td class="role-label">${user.role || "—"}</td>
          <td><span class="badge ${statusClass}">${statusText}</span></td>
        </tr>
      `;
    }).join("");

    rows = `
      <table>
        <thead>
          <tr>
            <th>ID / Code</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${tableBody}</tbody>
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>User Records Archive</title>
  <style>${REPORT_STYLES}</style>
</head>
<body>

  <div class="report-header">
    <div class="logo-area">
      <span class="school-name">EduCompose &mdash; Historical Data</span>
      <h1 class="report-title">User Records Archive</h1>
    </div>
    <div class="meta-grid">
      <div class="meta-item">
        <label>Generated</label>
        <span>${generatedDate}</span>
      </div>
    </div>
  </div>

  <div class="summary">
    <div class="stat">
      <label>Total Archived</label>
      <span>${totalRecords}</span>
    </div>
    <div class="stat">
      <label>Students</label>
      <span>${studentRecords}</span>
    </div>
    <div class="stat">
      <label>Teachers / Staff</label>
      <span>${teacherRecords}</span>
    </div>
  </div>

  <div class="section-title">Archived Accounts</div>
  ${rows}

  <div class="report-footer">
    <span>EduCompose Platform &mdash; Confidential &mdash; For Internal Use Only</span>
    <span>Generated ${generatedDate}</span>
  </div>

</body>
</html>`;
}
