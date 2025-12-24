import { Eye, Download, FileText, FileSpreadsheet } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { PlatformRubric } from "../../types/rubricTypes";
import { getTypeBadgeColor } from "../../data/rubricData";

interface PlatformRubricCardProps {
  rubric: PlatformRubric;
  onClick: () => void;
}

export function PlatformRubricCard({
  rubric,
  onClick,
}: PlatformRubricCardProps) {
  const totalPoints = rubric.criteria.reduce(
    (sum, c) => sum + Math.max(...c.scores.map((s) => s.points)),
    0
  );

  return (
    <Card
      className="p-5 hover:bg-neutral-50 cursor-pointer transition-all hover:shadow-md border-2 border-transparent hover:border-primary/20"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${getTypeBadgeColor(rubric.type)} border`}>
              {rubric.type}
            </Badge>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">
            {rubric.name}
          </h3>
          <p className="text-sm text-neutral-500 mb-3 line-clamp-2">
            {rubric.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <span>{rubric.criteria.length} Criteria</span>
            <span>{totalPoints} Points</span>
            <span>{rubric.programs} Programs</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e?.stopPropagation();
              onClick();
            }}
          >
            <Eye className="w-4 h-4 text-primary" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-4 h-4 text-neutral-500" />
              </Button>
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
                    alert("Failed to export rubric to PDF");
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
                    alert("Failed to export rubric to Excel");
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
    </Card>
  );
}

