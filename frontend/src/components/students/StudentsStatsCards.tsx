import Card from "../ui/Card";
import type { Student } from "../../data/studentsData";

interface StudentsStatsCardsProps {
  students: Student[];
  hasActiveFilters: boolean;
}

export function StudentsStatsCards({
  students,
  hasActiveFilters,
}: StudentsStatsCardsProps) {
  const activeStudents = students.filter(
    (s) => s.submitted > 0 || s.pending > 0
  ).length || students.length;

  const avgSubmissionRate =
    students.length > 0
      ? Math.round(
          (students.reduce(
            (acc, s) =>
              acc +
              s.submitted / Math.max(s.submitted + s.pending + s.missing, 1),
            0
          ) /
            students.length) *
            100
        ) || 0
      : 0;

  const atRiskStudents = students.filter(
    (s) => s.missing > 2 || s.avgScore < 70
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4">
        <p className="text-sm text-neutral-500">
          {hasActiveFilters ? "Filtered Students" : "Total Students"}
        </p>
        <p className="text-2xl text-neutral-900 mt-1">{students.length}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-neutral-500">Active Students</p>
        <p className="text-2xl text-success-default mt-1">{activeStudents}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-neutral-500">Avg. Submission Rate</p>
        <p className="text-2xl text-info-default mt-1">{avgSubmissionRate}%</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-neutral-500">At-Risk Students</p>
        <p className="text-2xl text-warning-default mt-1">{atRiskStudents}</p>
      </Card>
    </div>
  );
}

