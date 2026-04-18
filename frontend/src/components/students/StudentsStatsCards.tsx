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
      <Card className="p-5 border-l-4 border-l-primary rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-primary/5 rounded-xl text-primary">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em]">
              {hasActiveFilters ? "Filtered Total" : "Total Enrollment"}
            </p>
            <p className="text-3xl font-bold text-neutral-900 leading-none mt-2 tracking-tight">{totalCount}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 border-l-4 border-l-success-default rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-success-default/5 rounded-xl text-success-default">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em]">Active This Term</p>
            <p className="text-3xl font-bold text-success-default leading-none mt-2 tracking-tight">{activeCount}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 border-l-4 border-l-info-default rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-info-default/5 rounded-xl text-info-default">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em]">Avg Perf.</p>
            <p className="text-3xl font-bold text-info-default leading-none mt-2 tracking-tight">--%</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 border-l-4 border-l-warning-default rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-warning-default/5 rounded-xl text-warning-default">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em]">Attention Required</p>
            <p className="text-3xl font-bold text-warning-default leading-none mt-2 tracking-tight">0</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
