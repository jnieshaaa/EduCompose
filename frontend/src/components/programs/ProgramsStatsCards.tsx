import Card from "../ui/Card";
import { BookOpen, LayoutGrid, Users } from "lucide-react";

interface ProgramsStatsCardsProps {
  totalPrograms: number;
  totalSections: number;
  totalStudents: number;
}

export function ProgramsStatsCards({
  totalPrograms,
  totalSections,
  totalStudents,
}: ProgramsStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-neutral-500">Total Programs</p>
            <p className="text-2xl font-bold text-neutral-900">{totalPrograms}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-blue-50/50 to-blue-100/50 border-blue-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <LayoutGrid className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-neutral-500">Total Sections</p>
            <p className="text-2xl font-bold text-neutral-900">{totalSections}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-green-50/50 to-green-100/50 border-green-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-neutral-500">Total Students</p>
            <p className="text-2xl font-bold text-neutral-900">{totalStudents}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

