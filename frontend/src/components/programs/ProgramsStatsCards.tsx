import Card from "../ui/Card";
import { BookOpen, Layers, Users } from "lucide-react";

interface ProgramsStatsCardsProps {
  activePrograms: number;
  totalSections: number;
  totalStudents: number;
}

export function ProgramsStatsCards({
  activePrograms,
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
            <p className="text-sm text-neutral-500">Active Programs</p>
            <p className="text-2xl font-bold text-neutral-900">{activePrograms}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4 bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary/20 rounded-lg">
            <Layers className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <p className="text-sm text-neutral-500">Total Sections</p>
            <p className="text-2xl font-bold text-neutral-900">{totalSections}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4 bg-gradient-to-br from-success-default/5 to-success-default/10 border-success-default/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-success-default/20 rounded-lg">
            <Users className="w-5 h-5 text-success-default" />
          </div>
          <div>
            <p className="text-sm text-neutral-500">Est. Students</p>
            <p className="text-2xl font-bold text-neutral-900">{totalStudents}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

