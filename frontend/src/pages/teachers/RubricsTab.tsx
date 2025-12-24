import { useState, useEffect, useRef } from "react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

import {
  Plus,
  Upload,
  FileCheck,
  Edit,
  MoreVertical,
  X,
  // Settings,
  ClipboardList,
  Check,
  Trash2,
  Eye,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

// Extracted components
import {
  RubricDetailsForm,
  RubricCriteriaEditor,
} from "../../components/rubrics/RubricBuilderSteps";
import { RubricPreviewModal } from "../../components/rubrics/RubricPreviewModal";
import type {
  RubricFormData,
  BuilderMode,
  PlatformRubric,
  CriteriaRow,
} from "../../components/rubrics/types";
import {
  defaultRubricFormData,
  initialCriteria,
  platformRubrics,
} from "../../components/rubrics/types";
import type { ImportResult } from "../../services/rubricImportService";
// import type { PickedFile } from "../../lib/googleDrivePicker";

// Data imports
import type { RubricTemplate } from "../../data/rubricsData";
import { supabase } from "../../lib/supabaseClient";
// import { openGoogleDrivePicker } from "../../lib/googleDrivePicker";

// --- VIEW TYPES ---
type RubricView = "list" | "options";

// Supabase row shape for rubrics table (partial)
interface SupabaseRubricRow {
  id: number;
  name: string;
  description?: string | null;
  criteria: unknown; // JSONB column, can be array or object
  programs?: unknown; // could be string[] or null
  grading_intensity?: string | null;
  created_at?: string | null;
}

// --- UTILITY COMPONENTS ---

const EmptyRubricState = ({
  handleCreateClick,
}: {
  handleCreateClick: () => void;
}) => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="relative p-6 bg-purple-50 rounded-full mb-6">
      <ClipboardList className="w-16 h-16 text-purple-400" />
      <Check className="w-6 h-6 text-green-500 absolute bottom-6 right-6 bg-white rounded-full p-0.5 border border-white" />
    </div>
    <p className="text-neutral-500 mb-2">
      You haven't created any rubrics yet.
    </p>
    <button
      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
      onClick={handleCreateClick}
    >
      Create new rubric
    </button>
  </div>
);

const RubricCreationOptions = ({
  selectedMode,
  setMode,
}: {
  selectedMode: BuilderMode;
  setMode: (mode: BuilderMode) => void;
}) => {
  const options: {
    icon: React.ElementType;
    title: string;
    mode: BuilderMode;
  }[] = [
    { icon: Upload, title: "Upload or import", mode: "upload" },
    {
      icon: FileCheck,
      title: "Build from an existing template",
      mode: "template",
    },
    { icon: Edit, title: "Build from scratch", mode: "scratch" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 pb-4 border-b border-neutral-200 mb-6">
      {options.map((option) => (
        <Card
          key={option.mode}
          className={`p-4 flex flex-col items-center text-center cursor-pointer transition-colors border shadow-sm h-32 justify-center
            ${
              option.mode === selectedMode
                ? "border-primary bg-purple-50 ring-2 ring-primary/50"
                : "hover:bg-neutral-50"
            }
          `}
          onClick={() => setMode(option.mode)}
        >
          <option.icon className="w-6 h-6 text-primary mb-2" />
          <h3 className="text-sm font-medium text-neutral-900 whitespace-nowrap">
            {option.title}
          </h3>
        </Card>
      ))}
    </div>
  );
};

// --- UPLOAD MODE COMPONENT ---
interface UploadModeContentProps {
  onCancel: () => void;
  onImportSuccess: (rubricData: RubricFormData) => void;
}

const UploadModeContent = ({
  onCancel,
  onImportSuccess,
}: UploadModeContentProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    setSelectedFile(file);
    setUploadError(null);
    setUploadSuccess(false);

    // Check file extension
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["json", "xlsx", "xls", "pdf"].includes(extension || "")) {
      setUploadError(
        "Please upload an Excel (.xlsx), JSON (.json), or PDF (.pdf) file. Download the Excel template for the easiest format."
      );
      return;
    }

    setIsUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const rubricImportService = await import(
        "../../services/rubricImportService"
      );
      const { parseRubricJSON, parseRubricExcel } = rubricImportService;

      let result: ImportResult;
      if (extension === "json") {
        result = await parseRubricJSON(file);
      } else if (extension === "xlsx" || extension === "xls") {
        result = await parseRubricExcel(file);
      } else if (extension === "pdf") {
        setUploadError(
          "PDF import is not yet supported. Please convert your PDF to Excel format or use the Excel template."
        );
        setIsUploading(false);
        return;
      } else {
        setUploadError(
          "Unsupported file format. Please upload an Excel (.xlsx) or JSON (.json) file."
        );
        setIsUploading(false);
        return;
      }

      if (result.success && result.rubric) {
        // Convert imported rubric to RubricFormData format
        const rubricData: RubricFormData = {
          name: result.rubric.name,
          gradingIntensity: result.rubric.gradingIntensity,
          programs: result.rubric.programs,
          criteria: result.rubric.criteria,
        };

        setUploadSuccess(true);
        // Call the success handler after a short delay to show success message
        setTimeout(() => {
          onImportSuccess(rubricData);
        }, 1000);
      } else {
        setUploadError(result.error || "Failed to import rubric");
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to parse file"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleMyDeviceClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = async () => {
    const { downloadRubricExcelTemplate } = await import(
      "../../services/rubricImportService"
    );
    await downloadRubricExcelTemplate();
  };

  // const handleGoogleDriveClick = async () => {
  //   try {
  //     const pickedFile = await openGoogleDrivePicker();
  //     if (pickedFile) {
  //       setSelectedFile({
  //         name: pickedFile.name,
  //         // TODO: fetch file content from Drive API and parse
  //       } as File);
  //       console.log("Selected Google Drive file:", pickedFile);
  //     }
  //   } catch (error) {
  //     const message = error instanceof Error ? error.message : "Unknown error";
  //     console.error("Google Drive picker error:", message);
  //     alert(`Failed to open Google Drive picker: ${message}`);
  //   }
  // };

  return (
    <div className="w-full mt-6 p-6 border rounded-lg shadow-md bg-white">
      <h3 className="text-2xl font-semibold text-neutral-900 mb-6">
        Upload or Import
      </h3>
      <div className="space-y-6">
        <p className="text-neutral-600">
          Add your rubric file here and EduCompose will turn it into a digital,
          ready-to-use rubric.
        </p>
        <div className="border-2 border-dashed border-purple-300 bg-purple-50 p-16 text-center min-h-96 flex flex-col items-center justify-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.json,.pdf"
            className="hidden"
            onChange={handleFileSelect}
          />

          {selectedFile ? (
            <div className="space-y-4 w-full max-w-md">
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-neutral-200">
                <FileCheck className="w-6 h-6 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                {isUploading && (
                  <div className="text-sm text-neutral-500">Processing...</div>
                )}
                {uploadSuccess && (
                  <Badge className="bg-success-default text-white">
                    Imported!
                  </Badge>
                )}
                {uploadError && (
                  <Badge className="bg-error-default text-white">Error</Badge>
                )}
              </div>
              {uploadError && (
                <div className="p-3 bg-error-default/10 border border-error-default/20 rounded-lg">
                  <p className="text-sm text-error-default">{uploadError}</p>
                </div>
              )}
              {uploadSuccess && (
                <div className="p-3 bg-success-default/10 border border-success-default/20 rounded-lg">
                  <p className="text-sm text-success-default">
                    Rubric imported successfully! Redirecting to builder...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-neutral-500 mb-8 text-lg">
                Drop files here.{" "}
                <span
                  className="text-primary font-medium cursor-pointer hover:text-primary-300"
                  onClick={handleMyDeviceClick}
                >
                  browse files
                </span>{" "}
                or import from:
              </p>
              <div className="flex gap-10 justify-center">
                <button
                  type="button"
                  onClick={handleMyDeviceClick}
                  className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <Upload className="w-8 h-8 text-primary mx-auto" />
                  <p className="text-sm mt-2">My Device</p>
                </button>
              </div>
              <div className="mt-8 pt-6 border-t border-neutral-200">
                <p className="text-sm text-neutral-600 mb-3">
                  Need a template? Download our Excel template (recommended):
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Excel Template
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
          <h4 className="font-semibold text-neutral-900 mb-2">
            Supported File Formats:
          </h4>
          <ul className="text-sm text-neutral-600 space-y-2 list-disc list-inside mb-4">
            <li>
              <strong>Excel (.xlsx)</strong> - Recommended! Download the
              template above
            </li>
            {/* <li>
              <strong>JSON (.json)</strong> - For advanced users
            </li> */}
            {/* <li>
              <strong>PDF (.pdf)</strong> - Not yet supported (coming soon)
            </li> */}
          </ul>
          <h4 className="font-semibold text-neutral-900 mb-2 mt-4">
            Excel Format Instructions:
          </h4>
          <ul className="text-sm text-neutral-600 space-y-1 list-disc list-inside">
            <li>Row 1: Rubric Name</li>
            <li>Row 2: Description (optional)</li>
            <li>
              Row 3: Grading Intensity (Basic/Professional/Advanced/Technical)
            </li>
            <li>Row 4: Programs (comma-separated)</li>
            <li>Row 5: Empty row</li>
            <li>
              Row 6: Headers (Criterion, Score Level 1, Points 1, Description 1,
              Score Level 2, Points 2, Description 2, etc.)
            </li>
            <li>
              Row 7+: Criteria rows with titles, score levels, points, and
              descriptions
            </li>
            <li className="mt-2 font-medium text-neutral-800">
              Note: Each score level should include a description explaining
              what students need to demonstrate to achieve that score.
            </li>
          </ul>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-6 border-t mt-8">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {selectedFile && !uploadSuccess && (
          <Button
            className="bg-primary hover:bg-primary-300"
            onClick={handleMyDeviceClick}
            disabled={isUploading}
          >
            {isUploading ? "Processing..." : "Re-upload File"}
          </Button>
        )}
      </div>
    </div>
  );
};

// --- TEMPLATE MODE COMPONENT ---
interface TemplateModeContentProps {
  onCancel: () => void;
  onPreviewRubric: (rubric: PlatformRubric) => void;
}

const TemplateModeContent = ({
  onCancel,
  onPreviewRubric,
}: TemplateModeContentProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRubrics = platformRubrics.filter((rubric) =>
    rubric.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Basic":
        return "bg-green-500/10 text-green-700 border-green-500/30";
      case "Professional":
        return "bg-blue-500/10 text-blue-700 border-blue-500/30";
      case "Advanced":
        return "bg-purple-500/10 text-purple-700 border-purple-500/30";
      case "Technical":
        return "bg-orange-500/10 text-orange-700 border-orange-500/30";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-300";
    }
  };

  return (
    <div className="w-full mt-6 p-6 border rounded-lg shadow-md bg-white">
      <h3 className="text-2xl font-semibold text-neutral-900 mb-6">
        Select Template
      </h3>
      <div className="space-y-6">
        <p className="text-neutral-600">
          Select an existing template from the library. Click to preview and
          use.
        </p>
        <div className="border p-4 rounded-lg">
          <Input
            type="search"
            placeholder="Search rubrics..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="mb-4"
          />
          <div className="space-y-3">
            {filteredRubrics.map((rubric) => (
              <Card
                key={rubric.id}
                className="p-4 flex justify-between items-center bg-neutral-50 hover:bg-neutral-100 cursor-pointer transition-colors"
                onClick={() => onPreviewRubric(rubric)}
              >
                <div className="flex-1">
                  <h4 className="text-base font-medium text-neutral-900">
                    {rubric.name}
                  </h4>
                  <p className="text-sm text-neutral-500 mt-1">
                    {rubric.criteria.length} Criteria • {rubric.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getTypeBadgeColor(rubric.type)} border`}>
                    {rubric.type}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e?.stopPropagation();
                      onPreviewRubric(rubric);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-6 border-t mt-8">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

// --- SCRATCH MODE BUILDER ---
interface ScratchModeBuilderProps {
  formData: RubricFormData;
  onFormChange: (updates: Partial<RubricFormData>) => void;
  onSave: () => void;
  onCancel: () => void;
}

const ScratchModeBuilder = ({
  formData,
  onFormChange,
  onSave,
  onCancel,
}: ScratchModeBuilderProps) => {
  const [step, setStep] = useState<"details" | "criteria">("details");

  const handleContinue = () => {
    setStep("criteria");
  };

  const handleBack = () => {
    setStep("details");
  };

  return (
    <div className="w-full mt-6 p-6 border rounded-lg shadow-md bg-white">
      <h3 className="text-2xl font-semibold text-neutral-900 mb-6">
        {step === "details" ? "Rubric Details" : "Build Your Rubric"}
      </h3>

      {step === "details" ? (
        <RubricDetailsForm
          formData={formData}
          onFormChange={onFormChange}
          onContinue={handleContinue}
          onCancel={onCancel}
        />
      ) : (
        <RubricCriteriaEditor
          formData={formData}
          onFormChange={onFormChange}
          onSave={onSave}
          onBack={handleBack}
        />
      )}
    </div>
  );
};

// --- PLATFORM RUBRIC CARD ---
interface PlatformRubricCardProps {
  rubric: PlatformRubric;
  onClick: () => void;
}

const PlatformRubricCard = ({ rubric, onClick }: PlatformRubricCardProps) => {
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Basic":
        return "bg-green-500/10 text-green-700 border-green-500/30";
      case "Professional":
        return "bg-blue-500/10 text-blue-700 border-blue-500/30";
      case "Advanced":
        return "bg-purple-500/10 text-purple-700 border-purple-500/30";
      case "Technical":
        return "bg-orange-500/10 text-orange-700 border-orange-500/30";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-300";
    }
  };

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
                onClick={(e) => e?.stopPropagation()}
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
};

// --- MAIN TAB COMPONENT ---
export function RubricsTab() {
  const [currentView, setCurrentView] = useState<RubricView>("list");
  const [selectedMode, setSelectedMode] = useState<BuilderMode>(null);

  const [activeTab, setActiveTab] = useState<"platform" | "my">("platform");
  const [searchQuery, setSearchQuery] = useState("");

  // Lifted state: savedRubrics loaded from Supabase
  const [savedRubrics, setSavedRubrics] = useState<RubricTemplate[]>([]);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(true);
  const [teacherId, setTeacherId] = useState<number | null>(null);

  // Form state for the rubric builder
  const [rubricFormData, setRubricFormData] = useState<RubricFormData>(
    defaultRubricFormData
  );

  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedPreviewRubric, setSelectedPreviewRubric] =
    useState<PlatformRubric | null>(null);
  const [selectedMyRubric, setSelectedMyRubric] =
    useState<PlatformRubric | null>(null);

  // Get current teacher ID and load rubrics from Supabase
  useEffect(() => {
    const fetchTeacherAndRubrics = async () => {
      try {
        // Get current auth user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error("Error getting user:", userError);
          setIsLoadingRubrics(false);
          return;
        }

        // Get teacher record
        const { data: teacherData, error: teacherError } = await supabase
          .from("teachers")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        if (teacherError || !teacherData) {
          console.error("Error getting teacher:", teacherError);
          setIsLoadingRubrics(false);
          return;
        }

        setTeacherId(teacherData.id);

        // Load rubrics created by this teacher
        const { data: rubricsData, error: rubricsError } = await supabase
          .from("rubrics")
          .select(
            "id, name, description, criteria, programs, grading_intensity, created_at"
          )
          .eq("created_by", teacherData.id)
          .order("created_at", { ascending: false });

        if (rubricsError) {
          console.error("Error loading rubrics:", rubricsError);
        } else {
          // Map Supabase rubrics to RubricTemplate format
          // Helper to safely read metadata.programs from unknown criteria JSON
          const getMetadataPrograms = (obj: unknown): string[] | undefined => {
            if (!obj || typeof obj !== "object") return undefined;
            const maybeMeta = (obj as Record<string, unknown>)["metadata"];
            if (!maybeMeta || typeof maybeMeta !== "object") return undefined;
            const programsVal = (maybeMeta as Record<string, unknown>)[
              "programs"
            ];
            if (Array.isArray(programsVal)) return programsVal as string[];
            return undefined;
          };

          const mappedRubrics: (RubricTemplate & {
            programsList?: string[];
            fullData?: Record<string, unknown>;
          })[] = (rubricsData || []).map((r: SupabaseRubricRow) => {
            // Extract criteria from JSONB
            const criteriaObj: unknown = r.criteria;
            let criteriaData: CriteriaRow[] | null = null;

            // Check if criteria has metadata (old format) or is direct array (new format)
            if (typeof criteriaObj === "object" && criteriaObj !== null) {
              const maybeCriteria = (criteriaObj as Record<string, unknown>)[
                "criteria"
              ];
              if (Array.isArray(maybeCriteria)) {
                // Old format with metadata in criteria
                criteriaData = maybeCriteria as CriteriaRow[];
              }
            }

            if (!criteriaData && Array.isArray(criteriaObj)) {
              // New format - direct array
              criteriaData = criteriaObj as CriteriaRow[];
            }

            // Extract programs from dedicated column, fallback to criteria metadata for backward compatibility
            let programs: string[] = [];
            if (Array.isArray(r.programs)) {
              programs = r.programs as string[];
            } else {
              const metaPrograms = getMetadataPrograms(criteriaObj);
              if (metaPrograms) {
                programs = metaPrograms;
              }
            }

            return {
              id: r.id,
              name: r.name,
              criteria: criteriaData?.length || 0,
              programs: programs.length,
              lastUsed: r.created_at
                ? new Date(r.created_at).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
              level: "College",
              // Store programs array for display
              programsList: programs,
              // Store full rubric data for preview
              fullData: {
                id: r.id,
                name: r.name,
                description: r.description || "",
                type: r.grading_intensity || "Basic",
                criteria: criteriaData || [],
                programs: programs.length,
                lastUpdated: r.created_at
                  ? new Date(r.created_at).toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0],
              },
            };
          });
          setSavedRubrics(mappedRubrics);
        }
      } catch (err) {
        console.error("Unexpected error loading rubrics:", err);
      } finally {
        setIsLoadingRubrics(false);
      }
    };

    fetchTeacherAndRubrics();
  }, []);

  // Handlers
  const handleCreateClick = () => {
    setCurrentView("options");
    setSelectedMode(null);
    // Reset form data for new rubric
    setRubricFormData({
      ...defaultRubricFormData,
      criteria: [
        ...initialCriteria.map((c) => ({
          ...c,
          scores: c.scores.map((s) => ({ ...s })),
        })),
      ],
    });
  };

  const handleModeSelection = (mode: BuilderMode) => {
    setSelectedMode(mode);
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedMode(null);
  };

  const handleFormChange = (updates: Partial<RubricFormData>) => {
    setRubricFormData((prev) => ({ ...prev, ...updates }));
  };

  // Save rubric handler
  const handleSaveRubric = async () => {
    if (!teacherId) {
      console.error("Teacher ID not available");
      return;
    }

    try {
      // Save to Supabase with programs in dedicated column
      const { data, error } = await supabase
        .from("rubrics")
        .insert({
          name: rubricFormData.name || "Untitled Rubric",
          description: `Grading intensity: ${rubricFormData.gradingIntensity}`,
          criteria: rubricFormData.criteria,
          programs: rubricFormData.programs, // Store programs in dedicated column
          grading_intensity: rubricFormData.gradingIntensity,
          created_by: teacherId,
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving rubric:", error);
        return;
      }

      // Extract programs from dedicated column
      const programs = (data.programs as string[]) || [];

      // Map to RubricTemplate format and add to local state
      const newRubric: RubricTemplate & { programsList?: string[] } = {
        id: data.id,
        name: data.name,
        criteria: rubricFormData.criteria.length,
        programs: programs.length,
        lastUsed: new Date().toISOString().split("T")[0],
        level: "College",
        programsList: programs,
      };

      // Add to the savedRubrics list
      setSavedRubrics((prev) => [newRubric, ...prev]);

      // Switch view back to list
      setCurrentView("list");
      setSelectedMode(null);

      // Switch to "My rubrics" tab to show the new rubric
      setActiveTab("my");
    } catch (err) {
      console.error("Unexpected error saving rubric:", err);
    }
  };

  const handleCancelMode = () => {
    setSelectedMode(null);
  };

  // Preview modal handlers
  const handlePreviewRubric = (rubric: PlatformRubric) => {
    setSelectedPreviewRubric(rubric);
    setPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setSelectedPreviewRubric(null);
    setSelectedMyRubric(null);
  };

  const handlePreviewMyRubric = (
    rubric: RubricTemplate & {
      fullData?: Record<string, unknown>;
      programsList?: string[];
    }
  ) => {
    if (rubric.fullData) {
      setSelectedMyRubric(rubric.fullData as unknown as PlatformRubric);
      setPreviewModalOpen(true);
    }
  };

  const handleUseTemplate = async (rubric: PlatformRubric) => {
    if (!teacherId) {
      console.error("Teacher ID not available");
      return;
    }

    try {
      // Save template rubric to Supabase
      const { data, error } = await supabase
        .from("rubrics")
        .insert({
          name: rubric.name,
          description: rubric.description,
          criteria: rubric.criteria,
          programs: [], // Template rubrics don't have specific programs
          grading_intensity: rubric.type, // Use type as intensity
          created_by: teacherId,
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving template rubric:", error);
        return;
      }

      // Map to RubricTemplate format and add to local state
      const newRubric: RubricTemplate & { programsList?: string[] } = {
        id: data.id,
        name: rubric.name,
        criteria: rubric.criteria.length,
        programs: 0, // Template rubrics have no specific programs
        lastUsed: new Date().toISOString().split("T")[0],
        level: "College",
        programsList: [],
      };
      setSavedRubrics((prev) => [newRubric, ...prev]);
      handleClosePreview();
      setActiveTab("my");
    } catch (err) {
      console.error("Unexpected error saving template rubric:", err);
    }
  };

  const filteredPlatformRubrics = platformRubrics.filter(
    (rubric) =>
      rubric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rubric.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMyRubrics = savedRubrics.filter((rubric) =>
    rubric.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- RENDER FUNCTION ---
  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl text-neutral-900 font-semibold">
          {currentView === "options" ? "New Rubric" : "Rubrics"}
        </h1>
        <div className="flex gap-2">
          {currentView === "list" && (
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={handleCreateClick}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Rubric
            </Button>
          )}

          {currentView === "options" && (
            <Button variant="outline" onClick={handleBackToList}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}

      {/* View 2/3: Creation Options and Dynamic Builder */}
      {currentView === "options" && (
        <div className="w-full space-y-6">
          <Card className="p-6">
            <RubricCreationOptions
              selectedMode={selectedMode}
              setMode={handleModeSelection}
            />
          </Card>

          {/* Render mode-specific content */}
          {selectedMode === "upload" && (
            <UploadModeContent
              onCancel={handleCancelMode}
              onImportSuccess={(rubricData) => {
                // Set the imported rubric data to the form
                setRubricFormData(rubricData);
                // Switch to scratch mode to show the imported rubric
                setSelectedMode("scratch");
              }}
            />
          )}

          {selectedMode === "template" && (
            <TemplateModeContent
              onCancel={handleCancelMode}
              onPreviewRubric={handlePreviewRubric}
            />
          )}

          {selectedMode === "scratch" && (
            <ScratchModeBuilder
              formData={rubricFormData}
              onFormChange={handleFormChange}
              onSave={handleSaveRubric}
              onCancel={handleCancelMode}
            />
          )}
        </div>
      )}

      {/* View 1: Main Rubric List Screen */}
      {currentView === "list" && (
        <Card className="p-4">
          <div className="flex border-b border-neutral-200 mb-4">
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "platform"
                  ? "border-b-2 border-primary text-primary"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
              onClick={() => setActiveTab("platform")}
            >
              Platform rubrics ({platformRubrics.length})
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "my"
                  ? "border-b-2 border-primary text-primary"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
              onClick={() => setActiveTab("my")}
            >
              My rubrics ({savedRubrics.length})
            </button>
          </div>

          {/* Search Input */}
          <Input
            type="search"
            placeholder="Search rubrics by name or type..."
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
            className="mb-6"
          />

          {/* Tab Content */}
          <div>
            {activeTab === "platform" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPlatformRubrics.map((rubric) => (
                  <PlatformRubricCard
                    key={rubric.id}
                    rubric={rubric}
                    onClick={() => handlePreviewRubric(rubric)}
                  />
                ))}
              </div>
            )}

            {activeTab === "my" && (
              <>
                {isLoadingRubrics ? (
                  <div className="text-center py-8">
                    <p className="text-neutral-500">Loading rubrics...</p>
                  </div>
                ) : filteredMyRubrics.length === 0 ? (
                  <EmptyRubricState handleCreateClick={handleCreateClick} />
                ) : (
                  <div className="space-y-3">
                    {filteredMyRubrics.map((rubric) => {
                      const rubricWithPrograms = rubric as RubricTemplate & {
                        programsList?: string[];
                      };
                      const programsList =
                        rubricWithPrograms.programsList || [];
                      return (
                        <Card
                          key={rubric.id}
                          className="p-4 flex justify-between items-center hover:bg-neutral-50 cursor-pointer"
                        >
                          <div className="flex-1">
                            <h3 className="text-base text-neutral-900">
                              {rubric.name}
                            </h3>
                            <p className="text-sm text-neutral-500 mt-1">
                              {rubric.criteria} Criteria | {rubric.programs}{" "}
                              Program{rubric.programs !== 1 ? "s" : ""} | Last
                              Used: {rubric.lastUsed}
                            </p>
                            {programsList.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {programsList.map((program, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs bg-neutral-50 text-neutral-700 border-neutral-300"
                                  >
                                    {program}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge className="bg-primary/10 text-primary border border-primary/30">
                              College
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreviewMyRubric(rubric)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4 text-neutral-500" />
                                </Button>
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
                                        const { exportRubricToPDF } =
                                          await import(
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
                                <DropdownMenuItem>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Rubric
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-error-default">
                                  <Trash2 className="w-4 h-4 mr-2" />
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
      )}

      {/* Preview Modal for Platform Rubrics */}
      {selectedPreviewRubric && (
        <RubricPreviewModal
          rubric={selectedPreviewRubric}
          isOpen={previewModalOpen}
          onClose={handleClosePreview}
          onUseTemplate={handleUseTemplate}
        />
      )}

      {/* Preview Modal for My Rubrics */}
      {selectedMyRubric && (
        <RubricPreviewModal
          rubric={selectedMyRubric}
          isOpen={previewModalOpen}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}
