import type { Essay } from "../types/Essay";

export async function fetchEssays(): Promise<Essay[]> {
  return [
    {
      id: 1,
      student_id: 1,
      teacher_id: 1,
      class_id: 1,
      title: "The Impact of Technology on Education",
      content: "Technology has changed the way students learn...",
      status: "analyzed",
      submitted_at: new Date().toISOString(),
      grammar_score: 4,
      readability_score: 3,
    },
    {
      id: 2,
      student_id: 2,
      teacher_id: 1,
      class_id: 1,
      title: "Climate Change and Responsibility",
      content: "Climate change affects every living creature...",
      status: "analyzed",
      submitted_at: new Date().toISOString(),
      grammar_score: 5,
      readability_score: 4,
    },
  ];
}
