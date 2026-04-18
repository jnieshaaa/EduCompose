import {
  X,
  Copy,
  Download,
  BookOpen,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import Button from "../ui/Button";
import type { PlatformRubric } from "./types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useNotification } from "../../context/NotificationContext";

interface RubricPreviewModalProps {
  rubric:
    | PlatformRubric
    | {
        id: number;
        name: string;
        description: string;
        type: string;
        criteria: Array<{
          id: number;
          title: string;
          scores: Array<{
            id: number;
            title: string;
            points: number;
            description: string;
          }>;
        }>;
        programs: number;
        lastUpdated: string;
      };
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate?: (rubric: PlatformRubric) => void;
}

export function RubricPreviewModal({
  rubric,
  isOpen,
  onClose,
  onUseTemplate,
}: RubricPreviewModalProps) {
  const { showNotification } = useNotification();
  if (!isOpen) return null;

  // Calculate total possible points
  const maxPointsPerCriteria = rubric.criteria.map((c) =>
    Math.max(...c.scores.map((s) => s.points))
  );
  const totalPossiblePoints = maxPointsPerCriteria.reduce((a, b) => a + b, 0);

  // Get all unique point levels for the header
  const allPoints = new Set<number>();
  rubric.criteria.forEach((c) =>
    c.scores.forEach((s) => allPoints.add(s.points))
  );
  const pointHeaders = Array.from(allPoints).sort((a, b) => b - a);

  const typeBadgeStyles: Record<string, string> = {
    Basic: "bg-emerald-50 text-emerald-600 border-emerald-200",
    Professional: "bg-primary/5 text-primary border-primary/20",
    Advanced: "bg-amber-50 text-amber-600 border-amber-200",
    Technical: "bg-orange-50 text-orange-600 border-orange-200",
  };

  const badgeClass = typeBadgeStyles[rubric.type] || "bg-neutral-50 text-neutral-500 border-neutral-200";

  return (
    <div className='fixed inset-0 z-[90] flex items-center justify-center p-4'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* Modal */}
      <div className='relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col border border-neutral-100'>
        {/* ─── Header ─── */}
        <div className='flex items-start justify-between px-5 py-4 border-b border-neutral-100'>
          <div className='flex items-start gap-3 min-w-0'>
            <div className='w-9 h-9 bg-primary/5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5'>
              <BookOpen className='w-4 h-4 text-primary' />
            </div>
            <div className='min-w-0'>
              <div className='flex items-center gap-2 mb-1'>
                <h2 className='text-sm font-bold text-neutral-900 truncate'>
                  {rubric.name}
                </h2>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeClass}`}>
                  {rubric.type}
                </span>
              </div>
              <p className='text-xs text-neutral-400 line-clamp-1'>{rubric.description}</p>
              <div className='flex items-center gap-3 mt-1.5'>
                <span className='text-[10px] text-neutral-400'>
                  <strong className='text-neutral-600'>{rubric.criteria.length}</strong> criteria
                </span>
                <span className='text-neutral-200'>·</span>
                <span className='text-[10px] text-neutral-400'>
                  <strong className='text-neutral-600'>{totalPossiblePoints}</strong> pts
                </span>
                <span className='text-neutral-200'>·</span>
                <span className='text-[10px] text-neutral-400'>
                  <strong className='text-neutral-600'>{rubric.programs}</strong> programs
                </span>
                <span className='text-neutral-200'>·</span>
                <span className='text-[10px] text-neutral-300'>
                  {rubric.lastUpdated}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 hover:bg-neutral-100 rounded-lg transition-colors flex-shrink-0'
          >
            <X className='w-4 h-4 text-neutral-400' />
          </button>
        </div>

        {/* ─── Table ─── */}
        <div className='flex-1 overflow-auto'>
          <table className='w-full text-left'>
            <thead className='sticky top-0 z-10'>
              <tr className='bg-neutral-50 border-b border-neutral-100'>
                <th className='px-4 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider w-44 border-r border-neutral-100'>
                  Criteria
                </th>
                {pointHeaders.map((points) => (
                  <th
                    key={points}
                    className='px-4 py-3 text-center border-r border-neutral-100 last:border-r-0'
                  >
                    <span className='text-lg font-bold text-primary'>{points}</span>
                    <span className='block text-[9px] font-semibold text-neutral-400 uppercase tracking-wider mt-0.5'>
                      points
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-neutral-50'>
              {rubric.criteria.map((criteria) => (
                <tr
                  key={criteria.id}
                  className='hover:bg-neutral-50/50 transition-colors'
                >
                  <td className='px-4 py-3 border-r border-neutral-100 align-top'>
                    <span className='text-xs font-semibold text-neutral-800'>
                      {criteria.title}
                    </span>
                    <span className='block text-[10px] text-neutral-400 mt-0.5'>
                      Max {Math.max(...criteria.scores.map((s) => s.points))} pts
                    </span>
                  </td>
                  {pointHeaders.map((points) => {
                    const score = criteria.scores.find(
                      (s) => s.points === points
                    );
                    return (
                      <td
                        key={`${criteria.id}-${points}`}
                        className='px-4 py-3 border-r border-neutral-100 last:border-r-0 align-top'
                      >
                        {score ? (
                          <div>
                            <span className='text-[11px] font-semibold text-neutral-700'>
                              {score.title}
                            </span>
                            <p className='text-[10px] text-neutral-400 leading-relaxed mt-0.5'>
                              {score.description}
                            </p>
                          </div>
                        ) : (
                          <span className='text-neutral-200'>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── Score Legend ─── */}
        <div className='px-5 py-3 border-t border-neutral-100 bg-neutral-50/50'>
          <div className='flex items-center gap-5'>
            <span className='text-[10px] font-bold text-neutral-400 uppercase tracking-wider'>Score Guide</span>
            {pointHeaders.map((points) => {
              const sampleScore = rubric.criteria[0]?.scores.find(
                (s) => s.points === points
              );
              return (
                <div key={points} className='flex items-center gap-1.5'>
                  <span className='w-6 h-6 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]'>
                    {points}
                  </span>
                  <span className='text-[10px] text-neutral-500'>
                    {sampleScore?.title || `${points} pts`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div className='flex items-center justify-between px-5 py-3 border-t border-neutral-100'>
          <div className='flex gap-2'>
            {onUseTemplate && (
              <button
                onClick={() => onUseTemplate(rubric as PlatformRubric)}
                className='flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-300 transition-colors'
              >
                <Copy className='w-3.5 h-3.5' />
                Copy to My Rubrics
              </button>
            )}
            {onUseTemplate && (
              <span className='text-neutral-200 mx-1'>|</span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className='flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-700 transition-colors'>
                  <Download className='w-3.5 h-3.5' />
                  Export
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start'>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const { exportRubricToPDF } = await import(
                        "../../services/rubricExportService"
                      );
                      await exportRubricToPDF(rubric as PlatformRubric);
                    } catch (error) {
                      console.error("Error exporting to PDF:", error);
                      showNotification('error', "Failed to export rubric to PDF");
                    }
                  }}
                >
                  <FileText className='w-4 h-4 mr-2' />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const { exportRubricToExcel } = await import(
                        "../../services/rubricExportService"
                      );
                      await exportRubricToExcel(rubric as PlatformRubric);
                    } catch (error) {
                      console.error("Error exporting to Excel:", error);
                      showNotification('error', "Failed to export rubric to Excel");
                    }
                  }}
                >
                  <FileSpreadsheet className='w-4 h-4 mr-2' />
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className='flex gap-2'>
            <button
              onClick={onClose}
              className='px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors'
            >
              Close
            </button>
            {onUseTemplate && (
              <Button
                className='bg-primary hover:bg-primary-300 text-white font-bold text-xs h-8 px-4 shadow-md shadow-primary/15'
                onClick={() => onUseTemplate(rubric as PlatformRubric)}
              >
                Use This Template
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
