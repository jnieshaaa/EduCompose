import { useRef, useState } from "react";
import { Upload, Download, FileCheck } from "lucide-react";
import Badge from "../ui/Badge";
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
}
