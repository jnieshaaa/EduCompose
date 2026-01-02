import {
  Plus,
  X,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Input from "../ui/Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { RubricTemplate, PlatformRubric } from "../../types/rubricTypes";
import { getTypeBadgeColor } from "../../data/rubricData";
import { platformRubrics } from "../../data/rubricData";
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
    <Card className='p-4'>
      <div className='flex border-b border-neutral-200 mb-4'>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "platform"
              ? "border-b-2 border-primary text-primary"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
          onClick={() => onTabChange("platform")}
        >
          Platform rubrics ({platformRubrics.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "my"
              ? "border-b-2 border-primary text-primary"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
          onClick={() => onTabChange("my")}
        >
          My rubrics ({savedRubrics.length})
        </button>
      </div>

      {/* Search Input */}
      <Input
        type='search'
        placeholder='Search rubrics by name or type...'
        value={searchQuery}
        onChange={onSearchChange}
        className='mb-6'
      />

      {/* Tab Content */}
      <div>
        {activeTab === "platform" && (
          <>
            {filteredPlatformRubrics.length === 0 ? (
              <div className='text-center py-12'>
                <p className='text-neutral-500'>
                  {searchQuery
                    ? "No platform rubrics match your search."
                    : "No platform rubrics available."}
                </p>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
              <div className='text-center py-8'>
                <p className='text-neutral-500'>Loading rubrics...</p>
              </div>
            ) : filteredMyRubrics.length === 0 ? (
              <EmptyRubricState handleCreateClick={onCreateClick} />
            ) : (
              <div className='space-y-3'>
                {filteredMyRubrics.map((rubric) => {
                  const rubricWithPrograms = rubric as RubricTemplate & {
                    programsList?: string[];
                  };
                  const programsList = rubricWithPrograms.programsList || [];
                  return (
                    <Card
                      key={rubric.id}
                      className='p-4 flex justify-between items-center hover:bg-neutral-50 cursor-pointer'
                    >
                      <div className='flex-1'>
                        <h3 className='text-base text-neutral-900'>
                          {rubric.name}
                        </h3>
                        <p className='text-sm text-neutral-500 mt-1'>
                          {rubric.criteria} Criteria | {rubric.programs} Program
                          {rubric.programs !== 1 ? "s" : ""} | Last Used:{" "}
                          {rubric.lastUsed}
                        </p>
                        {programsList.length > 0 && (
                          <div className='mt-2 flex flex-wrap gap-1'>
                            {programsList.map((program, idx) => (
                              <Badge
                                key={idx}
                                variant='outline'
                                className='text-xs bg-neutral-50 text-neutral-700 border-neutral-300'
                              >
                                {program}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className='flex items-center gap-4'>
                        <Badge className='bg-primary/10 text-primary border border-primary/30'>
                          College
                        </Badge>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onPreviewMyRubric(rubric)}
                        >
                          <Eye className='w-4 h-4 mr-2' />
                          View
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='sm'>
                              <MoreVertical className='w-4 h-4 text-neutral-500' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
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
                              <FileText className='w-4 h-4 mr-2' />
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
                              <FileSpreadsheet className='w-4 h-4 mr-2' />
                              Export as Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className='w-4 h-4 mr-2' />
                              Edit Rubric
                            </DropdownMenuItem>
                            <DropdownMenuItem className='text-error-default'>
                              <Trash2 className='w-4 h-4 mr-2' />
                              Delete Rubric
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
