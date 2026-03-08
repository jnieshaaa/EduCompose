export type Course = { id: string; name: string };
export type Block = { id: string; name: string; courseId: string };
export type Rubric = { id: string; name: string };

export type EssayActivity = {
  id: string;
  title: string;
  courseId: string | "all";
  blockId: string | "all";
  rubricId: string | null;
  dueDate?: string;
  description?: string;
  createdAt: string;
  submissionCount: number;
  academicYear?: string;
  term?: string;
};

export type CourseSection = {
  id: string;
  name: string; // e.g., "BSCS-101 - 1A"
  courseName: string;
  sectionName: string;
  courseId: string;
  sectionId: string;
  studentCount: number;
  submissionCount: number;
};

export type Student = {
  id: string;
  name: string;
  status: "submitted" | "not submitted";
  coherence?: number;
  readability?: number;
  argumentative?: number;
  grammar?: number;
  score?: number;
};

export type NewActivityForm = {
  title: string;
  courseIds: string[]; // Array of selected course IDs
  sectionIds: string[]; // Array of selected section IDs
  rubricId: string | "";
  dueDate: string;
  description: string;
  academicYear?: string;
  term?: string;
};

