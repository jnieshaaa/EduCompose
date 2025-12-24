import type {
  Program,
  Block,
  Rubric,
  EssayActivity,
  ProgramSection,
  Student,
} from "../types/activityTypes";

// Demo data
export const demoPrograms: Program[] = [
  { id: "prog-1", name: "BS Computer Science" },
  { id: "prog-2", name: "BS Education" },
  { id: "prog-3", name: "BS Information Technology" },
];

export const demoBlocks: Block[] = [
  { id: "block-1", name: "Block A", programId: "prog-1" },
  { id: "block-2", name: "Block B", programId: "prog-1" },
  { id: "block-3", name: "Block C", programId: "prog-2" },
  { id: "block-4", name: "Block A", programId: "prog-3" },
];

export const demoRubrics: Rubric[] = [
  { id: "rubric-standard", name: "Standard Essay Rubric" },
  { id: "rubric-creative", name: "Creative Writing Rubric" },
  { id: "rubric-argument", name: "Argumentative Essay Rubric" },
];

// Sample activities for demonstration
export const initialActivities: EssayActivity[] = [
  {
    id: "activity-1",
    title: "Argumentative Essay on Climate Change",
    programId: "prog-1",
    blockId: "all",
    rubricId: "rubric-argument",
    dueDate: "2025-12-20",
    description:
      "Write a 1000-word argumentative essay discussing climate change policies.",
    createdAt: "2025-12-10",
    submissionCount: 24,
  },
  {
    id: "activity-2",
    title: "Machine Learning Ethics Analysis",
    programId: "prog-1",
    blockId: "block-1",
    rubricId: "rubric-standard",
    dueDate: "2025-12-18",
    description: "Analyze the ethical implications of AI in healthcare.",
    createdAt: "2025-12-08",
    submissionCount: 15,
  },
  {
    id: "activity-3",
    title: "Creative Writing: Short Story",
    programId: "prog-2",
    blockId: "all",
    rubricId: "rubric-creative",
    dueDate: "2025-12-25",
    description: "Write an original short story (500-800 words) on any topic.",
    createdAt: "2025-12-05",
    submissionCount: 8,
  },
];

// Generate program-sections for a given program
// Format: "BS Computer Science - 1A", "BS Computer Science - 1B", etc.
export const generateProgramSections = (
  programName: string
): ProgramSection[] => {
  const sections: ProgramSection[] = [];
  const years = [1, 2, 3, 4];
  const sectionLetters = ["A", "B", "C", "D"];

  years.forEach((year) => {
    sectionLetters.forEach((letter) => {
      sections.push({
        id: `${programName}-${year}${letter}`,
        name: `${programName} - ${year}${letter}`,
        programName: programName,
        sectionName: `${year}${letter}`,
        studentCount: Math.floor(Math.random() * 30) + 20, // 20-50 students
        submissionCount: Math.floor(Math.random() * 25) + 5, // 5-30 submissions
      });
    });
  });

  return sections;
};

// Generate demo students for a section
export const generateStudents = (sectionName: string): Student[] => {
  const students: Student[] = [];
  const names = [
    "John Doe",
    "Jane Smith",
    "Michael Johnson",
    "Emily Davis",
    "David Wilson",
    "Sarah Brown",
    "Robert Taylor",
    "Jessica Martinez",
    "William Anderson",
    "Ashley Thomas",
    "Christopher Jackson",
    "Amanda White",
    "Matthew Harris",
    "Stephanie Martin",
    "Daniel Thompson",
    "Laura Garcia",
    "James Rodriguez",
    "Michelle Lewis",
    "Andrew Lee",
    "Nicole Walker",
  ];

  names.forEach((name, index) => {
    const hasSubmitted = Math.random() > 0.3; // 70% submission rate
    students.push({
      id: `student-${sectionName}-${index}`,
      name: name,
      status: hasSubmitted ? "submitted" : "not submitted",
      coherence: hasSubmitted ? Math.floor(Math.random() * 30) + 70 : undefined,
      readability: hasSubmitted
        ? Math.floor(Math.random() * 30) + 70
        : undefined,
      argumentative: hasSubmitted
        ? Math.floor(Math.random() * 30) + 70
        : undefined,
      grammar: hasSubmitted ? Math.floor(Math.random() * 30) + 70 : undefined,
      score: hasSubmitted ? Math.floor(Math.random() * 20) + 80 : undefined,
    });
  });

  return students;
};

// Helper functions
export const getProgramLabel = (
  programId: string | "all",
  programs: Program[]
): string =>
  programId === "all"
    ? "All Programs"
    : programs.find((p) => p.id === programId)?.name ?? "Unknown";

export const getBlockLabel = (
  blockId: string | "all",
  blocks: Block[]
): string =>
  blockId === "all"
    ? "All Sections"
    : blocks.find((b) => b.id === blockId)?.name ?? "Unknown";

export const getRubricLabel = (
  rubricId: string | null,
  rubrics: Rubric[]
): string | null =>
  rubricId ? rubrics.find((r) => r.id === rubricId)?.name ?? "Unknown" : null;

export const getDueDateStatus = (dueDate?: string) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0)
    return {
      label: "Overdue",
      color: "bg-error-default/10 text-error-default border-error-default/20",
    };
  if (diffDays <= 3)
    return {
      label: `${diffDays}d left`,
      color:
        "bg-warning-default/10 text-warning-default border-warning-default/20",
    };
  if (diffDays <= 7)
    return {
      label: `${diffDays}d left`,
      color: "bg-info-default/10 text-info-default border-info-default/20",
    };
  return {
    label: dueDate,
    color: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };
};
