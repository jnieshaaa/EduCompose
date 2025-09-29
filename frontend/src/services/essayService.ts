import type { Essay } from "../types/Essay";

export async function fetchEssays(): Promise<Essay[]> {
  return [
    {
      id: 1,
      studentName: "Juan Dela Cruz",
      title: "The Impact of Technology on Education",
      content: "Technology has changed the way students learn...",
      grammarScore: 4,
      readabilityScore: 3,
    },
    {
      id: 2,
      studentName: "Maria Santos",
      title: "Climate Change and Responsibility",
      content: "Climate change affects every living creature...",
      grammarScore: 5,
      readabilityScore: 4,
    },
  ];
}
