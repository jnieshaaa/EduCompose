const fs = require('fs');
const path = 'c:/Users/j_ant/projects/EduCompose/frontend/src/services/activityService.ts';

let content = fs.readFileSync(path, 'utf8');

// 1. Fix types
content = content.replace(/block_id: string\[\] \| null;/g, 'block_id: string | null;');
content = content.replace(/course_id: string\[\] \| null;/g, 'course_id: string | null;');

// 2. Fix courseId mapping pattern
const courseIdOld = /courseId:\s+Array\.isArray\(row\.course_id\) && row\.course_id\.length > 0\s+\?\s+String\(row\.course_id\[0\]\)\s+:\s+"all",\s+courseIds:\s+Array\.isArray\(row\.course_id\)\s+\?\s+row\.course_id\.map\(String\)\s+:\s+\[\],/g;
const courseIdNew = `courseId: row.course_id ? String(row.course_id) : "all",
      courseIds: row.course_id ? [String(row.course_id)] : [],`;

content = content.replace(courseIdOld, courseIdNew);

// 3. Fix blockId mapping pattern
const blockIdOld = /blockId:\s+Array\.isArray\(row\.block_id\) && row\.block_id\.length > 0\s+\?\s+String\(row\.block_id\[0\]\)\s+:\s+"all",\s+blockIds:\s+Array\.isArray\(row\.block_id\)\s+\?\s+row\.block_id\.map\(String\)\s+:\s+\[\],/g;
const blockIdNew = `blockId: row.block_id ? String(row.block_id) : "all",
      blockIds: row.block_id ? [String(row.block_id)] : [],`;

content = content.replace(blockIdOld, blockIdNew);

// 4. Fix programId mapping pattern (program_id IS still an array, but let's check if there are others)
// Actually program_id is still uuid[] according to schema.

fs.writeFileSync(path, content);
console.log("Successfully updated activityService.ts");
