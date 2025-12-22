/**
 * View Layer: Batch Upload Dialog Component
 * UI component for batch file uploads
 */

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import Button from "./Button";
import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import { BatchUploadController } from "../../services/BatchUploadController";
import type { UploadResult } from "../../services/BatchUploadController";
import type { Program } from "../../data/programsData";
import type { Section } from "../../data/sectionsData";
import type { Student } from "../../data/studentsData";

interface BatchUploadDialogProps {
  type: "programs" | "sections" | "students";
  onUploadComplete: (result: UploadResult) => void;
  trigger?: React.ReactNode;
  existingPrograms?: Program[];
  existingSections?: Section[];
  existingStudents?: Student[];
  availablePrograms?: string[];
  availableSections?: string[];
  // Optional: When provided, these will be used instead of reading from CSV
  defaultProgram?: string;
  defaultSection?: string;
}

export function BatchUploadDialog({
  type,
  onUploadComplete,
  trigger,
  existingPrograms = [],
  existingSections = [],
  existingStudents = [],
  availablePrograms = [],
  availableSections = [],
  defaultProgram,
  defaultSection,
}: BatchUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "xlsx" && extension !== "xls") {
      // File type validation - using alert for now, can be replaced with modal if needed
      alert("Please select a .csv or .xlsx file");
      return;
    }

    setSelectedFile(file);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setResult(null);

    try {
      let uploadResult: UploadResult;

      switch (type) {
        case "programs":
          uploadResult = await BatchUploadController.uploadPrograms(
            selectedFile,
            existingPrograms
          );
          break;
        case "sections":
          uploadResult = await BatchUploadController.uploadSections(
            selectedFile,
            existingSections,
            availablePrograms
          );
          break;
        case "students":
          uploadResult = await BatchUploadController.uploadStudents(
            selectedFile,
            existingStudents,
            availablePrograms,
            availableSections,
            defaultProgram,
            defaultSection
          );
          break;
        default:
          throw new Error("Unknown upload type");
      }

      setResult(uploadResult);
      onUploadComplete(uploadResult);

      // Auto-close on success if no errors
      if (uploadResult.success && uploadResult.errors.length === 0) {
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error) {
      const errorResult: UploadResult = {
        success: false,
        message: error instanceof Error ? error.message : "Upload failed",
        imported: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
      setResult(errorResult);
      onUploadComplete(errorResult);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getExpectedColumns = () => {
    switch (type) {
      case "programs":
        return ["name", "description", "tracks", "status"];
      case "sections":
        return ["name", "program", "term", "students"];
      case "students":
        const baseColumns = [
          "id",
          "firstname",
          "middlename (optional)",
          "lastname",
          "email",
        ];
        // Only include program/section if not provided as defaults
        if (!defaultProgram) {
          baseColumns.push("program");
        }
        if (!defaultSection) {
          baseColumns.push("section");
        }
        return baseColumns;
      default:
        return [];
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case "programs":
        return "Programs";
      case "sections":
        return "Sections/Blocks";
      case "students":
        return "Students";
      default:
        return "Items";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Batch Upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch Upload {getTypeLabel()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Select File (.csv or .xlsx)
            </label>
            <div className="border-2 border-dashed border-neutral-300 rounded-rd p-6 text-center hover:border-primary transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="batch-upload-file"
              />
              <label
                htmlFor="batch-upload-file"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                <span className="text-sm text-neutral-600">
                  Click to select or drag and drop
                </span>
                <span className="text-xs text-neutral-500 mt-1">
                  CSV or XLSX files only
                </span>
              </label>
            </div>

            {selectedFile && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-neutral-50 rounded-rd">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm text-neutral-700 flex-1">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </span>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Expected Columns */}
          <div className="bg-primary/5 border border-primary/20 rounded-rd p-4">
            <h4 className="text-sm font-medium text-neutral-900 mb-2">
              Expected Columns:
            </h4>
            <div className="flex flex-wrap gap-2">
              {getExpectedColumns().map((col) => (
                <span
                  key={col}
                  className="px-2 py-1 bg-white text-xs text-neutral-700 rounded-rs border border-neutral-200"
                >
                  {col}
                </span>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Column names are case-insensitive and can include spaces or underscores
            </p>
            {type === "students" && (defaultProgram || defaultSection) && (
              <p className="text-xs text-info-default mt-2">
                Note: Program and Section are automatically set from the current context.
                You don't need to include these columns in your file.
              </p>
            )}
          </div>

          {/* Upload Result */}
          {result && (
            <div
              className={`p-4 rounded-rd border ${
                result.success
                  ? "bg-success-default/10 border-success-default/20"
                  : "bg-error-default/10 border-error-default/20"
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-success-default mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-error-default mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      result.success ? "text-success-default" : "text-error-default"
                    }`}
                  >
                    {result.message}
                  </p>
                  {result.errors.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      <p className="text-xs text-neutral-600 mb-1">Errors:</p>
                      {result.errors.slice(0, 10).map((error, idx) => (
                        <p key={idx} className="text-xs text-error-default">
                          {error}
                        </p>
                      ))}
                      {result.errors.length > 10 && (
                        <p className="text-xs text-neutral-500 mt-1">
                          ... and {result.errors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="bg-primary hover:bg-primary-300"
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

