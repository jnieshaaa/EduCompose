import { useRef, useState } from "react";
import { Upload, Download, Loader2, AlertCircle, CheckCircle, FileSpreadsheet, Info } from "lucide-react";
import Button from "../ui/Button";
import type { RubricFormData } from "../../types/rubricTypes";
import type { ImportResult } from "../../services/rubricImportService";

interface UploadModeViewProps {
  onCancel: () => void;
  onImportSuccess: (rubricData: RubricFormData) => void;
}

export function UploadModeView({
  onCancel,
  onImportSuccess,
}: UploadModeViewProps) {
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

  return (
    <div className="w-full mt-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-neutral-900">
            Import Rubric
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Upload a file and EduCompose will convert it to a digital rubric
          </p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-300 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Excel Template
        </button>
      </div>

      {/* ─── Drop Zone ─── */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer group ${
          selectedFile
            ? "border-neutral-200 bg-white"
            : "border-neutral-200 bg-neutral-50/50 hover:border-primary/40 hover:bg-primary/[0.02]"
        }`}
        onClick={!selectedFile ? handleMyDeviceClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.json,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        {selectedFile ? (
          <div className="space-y-3 max-w-sm mx-auto">
            {/* File Info */}
            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
              <div className="w-9 h-9 bg-white border border-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-neutral-800 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-[10px] text-neutral-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {isUploading && (
                <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
              )}
              {uploadSuccess && (
                <CheckCircle className="w-4 h-4 text-success-default flex-shrink-0" />
              )}
              {uploadError && (
                <AlertCircle className="w-4 h-4 text-error-default flex-shrink-0" />
              )}
            </div>

            {/* Status Messages */}
            {isUploading && (
              <p className="text-[11px] text-neutral-400 font-medium">
                Parsing rubric data…
              </p>
            )}
            {uploadError && (
              <div className="p-3 bg-error-default/5 border border-error-default/15 rounded-lg text-left">
                <p className="text-[11px] text-error-dark leading-relaxed">{uploadError}</p>
              </div>
            )}
            {uploadSuccess && (
              <div className="p-3 bg-success-default/5 border border-success-default/15 rounded-lg">
                <p className="text-[11px] text-success-dark font-medium">
                  Rubric imported! Redirecting to builder…
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-white border border-neutral-100 rounded-xl flex items-center justify-center group-hover:scale-105 group-hover:border-primary/20 transition-all">
              <Upload className="w-5 h-5 text-neutral-400 group-hover:text-primary transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-700">
                Drop your rubric file or{" "}
                <span className="text-primary">browse</span>
              </p>
              <p className="text-[11px] text-neutral-400 mt-1">
                Excel (.xlsx) &middot; JSON &middot; PDF
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Format Guide ─── */}
      <div className="mt-4 bg-neutral-50 rounded-xl border border-neutral-100 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-neutral-100 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Excel Format Guide
          </span>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
          <div className="flex items-start gap-2">
            <span className="text-[9px] font-bold text-neutral-300 mt-0.5 w-5 flex-shrink-0">R1</span>
            <span className="text-[11px] text-neutral-500">Rubric Name</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[9px] font-bold text-neutral-300 mt-0.5 w-5 flex-shrink-0">R2</span>
            <span className="text-[11px] text-neutral-500">Description <span className="text-neutral-300">(optional)</span></span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[9px] font-bold text-neutral-300 mt-0.5 w-5 flex-shrink-0">R3</span>
            <span className="text-[11px] text-neutral-500">Grading Intensity</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[9px] font-bold text-neutral-300 mt-0.5 w-5 flex-shrink-0">R4</span>
            <span className="text-[11px] text-neutral-500">Programs <span className="text-neutral-300">(comma-separated)</span></span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[9px] font-bold text-neutral-300 mt-0.5 w-5 flex-shrink-0">R6</span>
            <span className="text-[11px] text-neutral-500">Column headers</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[9px] font-bold text-neutral-300 mt-0.5 w-5 flex-shrink-0">R7+</span>
            <span className="text-[11px] text-neutral-500">Criteria data rows</span>
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div className="flex items-center justify-end gap-2.5 pt-5 mt-5 border-t border-neutral-100">
        <Button variant="ghost" onClick={onCancel} className="text-sm">
          Cancel
        </Button>
        {selectedFile && !uploadSuccess && (
          <Button
            className="bg-primary hover:bg-primary-300 text-white font-bold text-sm h-10 px-5 shadow-md shadow-primary/15"
            onClick={handleMyDeviceClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-1.5" />
                Re-upload
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
