import type {
  Course,
  Block,
  Rubric,
  EssayActivity,
  CourseSection,
  Student,
} from "../types/activityTypes";

// Demo data
export const demoCourses: Course[] = [
  { id: "course-1", name: "CS-101" },
  { id: "course-2", name: "ENG-202" },
  { id: "course-3", name: "MATH-303" },
];

export const demoBlocks: Block[] = [
  { id: "block-1", name: "Block A", courseId: "course-1" },
  { id: "block-2", name: "Block B", courseId: "course-1" },
  { id: "block-3", name: "Block C", courseId: "course-2" },
  { id: "block-4", name: "Block A", courseId: "course-3" },
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
    courseId: "course-1",
    blockId: "all",
    rubricId: "rubric-argument",
    dueDate: "2025-12-20",
    description:
      "Write a 1000-word argumentative essay discussing climate change policies.",
    createdAt: "2025-12-10",
    submissionCount: 24,
  },
];

// Generate course-sections for a given course
export const generateCourseSections = (
  courseName: string
): CourseSection[] => {
  const sections: CourseSection[] = [];
  const sectionNames = ["BSCS-1A", "BSCS-1B", "BSIT-2A"];

  sectionNames.forEach((name) => {
    sections.push({
      id: `${courseName}-${name}`,
      name: `${courseName} - ${name}`,
      courseName: courseName,
      sectionName: name,
      courseId: "1",
      sectionId: "1",
      studentCount: Math.floor(Math.random() * 30) + 20,
      submissionCount: Math.floor(Math.random() * 25) + 5,
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
  ];

  names.forEach((name, index) => {
    const hasSubmitted = Math.random() > 0.3;
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

