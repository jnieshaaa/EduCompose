export type Program = { id: string; name: string };
export type Block = { id: string; name: string; programId: string };
export type Rubric = { id: string; name: string };

export type EssayActivity = {
  id: string;
  title: string;
  programId: string | "all";
  blockId: string | "all";
  rubricId: string | null;
  dueDate?: string;
  description?: string;
  createdAt: string;
  submissionCount: number;
};

export type ProgramSection = {
  id: string;
  name: string; // e.g., "BS Computer Science - 1A"
  programName: string;
  sectionName: string;
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
  programIds: string[]; // Array of selected program IDs, empty means "all"
  sectionIds: string[]; // Array of selected section IDs, empty means "all"
  rubricId: string | "";
  dueDate: string;
  description: string;
};
