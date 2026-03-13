import Card from "../ui/Card";
import type { Student } from "../../types/academic";
import { Users, UserCheck, Activity, AlertTriangle } from "lucide-react";

interface StudentsStatsCardsProps {
  students: Student[];
  hasActiveFilters: boolean;
}

export function StudentsStatsCards({
  students,
  hasActiveFilters,
}: StudentsStatsCardsProps) {
  // Simplified stats for now, focusing on count as the rest depends on essay data
  const totalCount = students.length;
  const activeCount = students.length; // Placeholder

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4 border-l-4 border-l-primary">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/5 rounded-lg text-primary">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              {hasActiveFilters ? "Filtered Total" : "Total Students"}
            </p>
            <p className="text-2xl font-black text-neutral-900 leading-none mt-1">{totalCount}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-l-4 border-l-success-default">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-success-default/5 rounded-lg text-success-default">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active This Term</p>
            <p className="text-2xl font-black text-success-default leading-none mt-1">{activeCount}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-l-4 border-l-info-default">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-info-default/5 rounded-lg text-info-default">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Avg Perf.</p>
            <p className="text-2xl font-black text-info-default leading-none mt-1">--%</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-l-4 border-l-warning-default">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-warning-default/5 rounded-lg text-warning-default">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Requires Attention</p>
            <p className="text-2xl font-black text-warning-default leading-none mt-1">0</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
