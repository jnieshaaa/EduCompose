import { Eye, Download, FileText, FileSpreadsheet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { PlatformRubric } from "../../types/rubricTypes";
import { useNotification } from "../../contexts/NotificationContext";

const typeBadgeStyles: Record<string, string> = {
  Basic: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Professional: "bg-primary/5 text-primary border-primary/20",
  Advanced: "bg-amber-50 text-amber-600 border-amber-200",
  Technical: "bg-orange-50 text-orange-600 border-orange-200",
};

interface PlatformRubricCardProps {
  rubric: PlatformRubric;
  onClick: () => void;
}

export function PlatformRubricCard({
  rubric,
  onClick,
}: PlatformRubricCardProps) {
  const { showNotification } = useNotification();
  const totalPoints = rubric.criteria.reduce(
    (sum, c) => sum + Math.max(...c.scores.map((s) => s.points)),
    0
  );

  const badgeClass = typeBadgeStyles[rubric.type] || "bg-neutral-50 text-neutral-500 border-neutral-200";

  return (
    <div
      className="bg-white border border-neutral-100 rounded-xl p-4 hover:border-neutral-200 hover:shadow-sm cursor-pointer transition-all group"
      onClick={onClick}
    >
      {/* Top: Type badge + actions */}
      <div className="flex items-center justify-between mb-2.5">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeClass}`}>
          {rubric.type}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            title="Preview"
          >
            <Eye className="w-3.5 h-3.5 text-primary" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="Export"
              >
                <Download className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const { exportRubricToPDF } = await import(
                      "../../services/rubricExportService"
                    );
                    await exportRubricToPDF(rubric);
                  } catch (error) {
                    console.error("Error exporting to PDF:", error);
                    showNotification('error', "Failed to export rubric to PDF");
                  }
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const { exportRubricToExcel } = await import(
                      "../../services/rubricExportService"
                    );
                    await exportRubricToExcel(rubric);
                  } catch (error) {
                    console.error("Error exporting to Excel:", error);
                    showNotification('error', "Failed to export rubric to Excel");
                  }
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Title + Description */}
      <h3 className="text-sm font-bold text-neutral-800 mb-0.5 line-clamp-1 group-hover:text-primary transition-colors">
        {rubric.name}
      </h3>
      <p className="text-xs text-neutral-400 line-clamp-2 mb-3 leading-relaxed">
        {rubric.description}
      </p>

      {/* Meta stats */}
      <div className="pt-2.5 border-t border-neutral-50 flex items-center gap-3">
        <span className="text-[11px] text-neutral-400">
          <strong className="text-neutral-600 font-bold">{rubric.criteria.length}</strong> criteria
        </span>
        <span className="text-neutral-200">·</span>
        <span className="text-[11px] text-neutral-400">
          <strong className="text-neutral-600 font-bold">{totalPoints}</strong> pts
        </span>
        <span className="text-neutral-200">·</span>
        <span className="text-[11px] text-neutral-400">
          <strong className="text-neutral-600 font-bold">{rubric.programs}</strong> programs
        </span>
      </div>
    </div>
  );
}
