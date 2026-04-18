import {
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  FileSpreadsheet,
  Search,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { RubricTemplate, PlatformRubric } from "../../types/rubricTypes";
import { platformRubrics } from "./types";
import { EmptyRubricState } from "./EmptyRubricState";
import { PlatformRubricCard } from "./PlatformRubricCard";

interface RubricsListViewProps {
  activeTab: "platform" | "my";
  onTabChange: (tab: "platform" | "my") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  savedRubrics: (RubricTemplate & {
    fullData?: Record<string, unknown>;
    programsList?: string[];
  })[];
  isLoadingRubrics: boolean;
  onCreateClick: () => void;
  onPreviewRubric: (rubric: PlatformRubric) => void;
  onPreviewMyRubric: (
    rubric: RubricTemplate & {
      fullData?: Record<string, unknown>;
      programsList?: string[];
    }
  ) => void;
  onEditRubric: (rubricId: number) => void;
  onDeleteRubric: (rubricId: number) => void;
}

export function RubricsListView({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  savedRubrics,
  isLoadingRubrics,
  onCreateClick,
  onPreviewRubric,
  onPreviewMyRubric,
  onEditRubric,
  onDeleteRubric,
}: RubricsListViewProps) {
  const filteredPlatformRubrics = (platformRubrics || []).filter(
    (rubric) =>
      rubric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rubric.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMyRubrics = savedRubrics.filter((rubric) =>
    rubric.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Tab Bar + Search Row */}
      <div className="flex items-center justify-between border-b border-neutral-100 mb-5">
        <div className="flex items-center gap-0">
          <button
            className={`px-4 py-2.5 text-xs font-bold transition-colors relative ${
              activeTab === "platform"
                ? "text-primary"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
            onClick={() => onTabChange("platform")}
          >
            Platform
            <span className="ml-1.5 text-[10px] font-semibold text-neutral-300">{platformRubrics.length}</span>
            {activeTab === "platform" && (
              <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-primary rounded-full" />
            )}
          </button>
          <button
            className={`px-4 py-2.5 text-xs font-bold transition-colors relative ${
              activeTab === "my"
                ? "text-primary"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
            onClick={() => onTabChange("my")}
          >
            My Rubrics
            <span className="ml-1.5 text-[10px] font-semibold text-neutral-300">{savedRubrics.length}</span>
            {activeTab === "my" && (
              <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-primary rounded-full" />
            )}
          </button>
        </div>

        {/* Inline Search */}
        <div className="relative mb-[-1px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-300" />
          <input
            type="text"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-neutral-200 rounded-lg text-xs bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 focus:bg-white transition-all placeholder:text-neutral-300 w-48"
          />
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "platform" && (
          <>
            {filteredPlatformRubrics.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-neutral-400">
                  {searchQuery
                    ? "No platform rubrics match your search."
                    : "No platform rubrics available."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredPlatformRubrics.map((rubric) => (
                  <PlatformRubricCard
                    key={rubric.id}
                    rubric={rubric}
                    onClick={() => onPreviewRubric(rubric)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "my" && (
          <>
            {isLoadingRubrics ? (
              <div className="flex flex-col items-center gap-2 py-12">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-xs text-neutral-400">Loading rubrics…</span>
              </div>
            ) : filteredMyRubrics.length === 0 ? (
              <EmptyRubricState handleCreateClick={onCreateClick} />
            ) : (
              <div className="space-y-2">
                {filteredMyRubrics.map((rubric) => {
                  const rubricWithPrograms = rubric as RubricTemplate & {
                    programsList?: string[];
                  };
                  const programsList = rubricWithPrograms.programsList || [];
                  return (
                    <div
                      key={rubric.id}
                      className="flex items-center justify-between p-3.5 bg-neutral-50 border border-neutral-100 rounded-xl hover:border-neutral-200 transition-colors group"
                    >
                      {/* Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 bg-white border border-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:border-primary/20 transition-colors">
                          <BookOpen className="w-4 h-4 text-neutral-400 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-neutral-800 truncate">
                            {rubric.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-neutral-400">
                              {rubric.criteria} criteria
                            </span>
                            {programsList.length > 0 && (
                              <>
                                <span className="text-neutral-200">&middot;</span>
                                <div className="flex gap-1">
                                  {programsList.slice(0, 3).map((program, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[9px] font-semibold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10"
                                    >
                                      {program}
                                    </span>
                                  ))}
                                  {programsList.length > 3 && (
                                    <span className="text-[9px] text-neutral-400">+{programsList.length - 3}</span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => onPreviewMyRubric(rubric)}
                          className="p-1.5 text-neutral-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const rubricData =
                                    rubric as RubricTemplate & {
                                      fullData?: PlatformRubric;
                                    };
                                  if (rubricData.fullData) {
                                    const { exportRubricToPDF } = await import(
                                      "../../services/rubricExportService"
                                    );
                                    await exportRubricToPDF(
                                      rubricData.fullData
                                    );
                                  }
                                } catch (error) {
                                  console.error(
                                    "Error exporting to PDF:",
                                    error
                                  );
                                  alert("Failed to export rubric to PDF");
                                }
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Export as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const rubricData =
                                    rubric as RubricTemplate & {
                                      fullData?: PlatformRubric;
                                    };
                                  if (rubricData.fullData) {
                                    const { exportRubricToExcel } =
                                      await import(
                                        "../../services/rubricExportService"
                                      );
                                    await exportRubricToExcel(
                                      rubricData.fullData
                                    );
                                  }
                                } catch (error) {
                                  console.error(
                                    "Error exporting to Excel:",
                                    error
                                  );
                                  alert("Failed to export rubric to Excel");
                                }
                              }}
                            >
                              <FileSpreadsheet className="w-4 h-4 mr-2" />
                              Export as Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEditRubric(rubric.id)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Rubric
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-error-default"
                              onClick={() => onDeleteRubric(rubric.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Rubric
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
