import type { Essay } from "../types/Essay";

export async function fetchEssays(): Promise<Essay[]> {
  return [
    {
      id: "essay-001",
      student_id: "student-001",
      user_id: "user-001",
      class_id: "class-001",
      title: "The Impact of Technology on Education",
      content: "Technology has changed the way students learn...",
      status: "analyzed",
      submitted_at: new Date().toISOString(),
      grammar_score: 4,
      readability_score: 3,
    },
    {
      id: "essay-002",
      student_id: "student-002",
      user_id: "user-001",
      class_id: "class-001",
      title: "Climate Change and Responsibility",
      content: "Climate change affects every living creature...",
      status: "analyzed",
      submitted_at: new Date().toISOString(),
      grammar_score: 5,
      readability_score: 4,
    },
  ];
}
