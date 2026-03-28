import { useState, useEffect } from "react";
import {
  X,
  Download,
  Loader2,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { fetchEssayByStudentAndActivity } from "../../services/activityService";

interface ViewEssayModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  activityId: string;
}

export function ViewEssayModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  activityId,
}: ViewEssayModalProps) {
  const [essayData, setEssayData] = useState<{
    fileUrl: string;
    title: string;
    fileType: string;
    content?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    if (isOpen && studentId && activityId) {
      loadEssay();
    } else {
      // Reset state when modal closes
      setEssayData(null);
      setError(null);
      setZoomLevel(100);
    }
  }, [isOpen, studentId, activityId]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const loadEssay = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchEssayByStudentAndActivity(studentId, activityId);
      if (data) {
        setEssayData(data);
      } else {
        setError("Essay submission not found");
      }
    } catch (err) {
      console.error("Error loading essay:", err);
      setError("Failed to load essay. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (essayData?.fileUrl) {
      const link = document.createElement("a");
      link.href = essayData.fileUrl;
      link.download = essayData.title || "essay-submission";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`View Essay - ${studentName}`}
      size="xl"
      contentClassName="p-0"
    >
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-neutral-900">
              {essayData?.title || "Essay Submission"}
            </h3>
            <p className="text-sm text-neutral-500">{studentName}</p>
          </div>
          <div className="flex items-center gap-2">
            {essayData && essayData.fileType === "image" && (
              <div className="flex items-center gap-1 border-r pr-2 mr-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 50}
                  className="flex items-center gap-1"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-neutral-600 px-2 min-w-[60px] text-center">
                  {zoomLevel}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 300}
                  className="flex items-center gap-1"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetZoom}
                  disabled={zoomLevel === 100}
                  className="flex items-center gap-1"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            )}
            {essayData && essayData.fileType !== "text" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-neutral-50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-neutral-600">Loading essay...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <FileText className="w-16 h-16 text-neutral-300 mb-4" />
              <p className="text-neutral-600 font-medium">{error}</p>
              <Button variant="outline" onClick={loadEssay} className="mt-4">
                Retry
              </Button>
            </div>
          ) : essayData ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {essayData.fileType === "pdf" ? (
                <iframe
                  src={essayData.fileUrl}
                  className="w-full h-[calc(90vh-200px)] min-h-[600px] border-0"
                  title={essayData.title}
                />
              ) : essayData.fileType === "image" ? (
                <div className="flex items-center justify-center p-8 overflow-auto bg-neutral-100">
                  <div
                    className="transition-transform duration-200 ease-in-out"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: "center center",
                    }}
                  >
                    <img
                      src={essayData.fileUrl}
                      alt={essayData.title}
                      className="max-w-full max-h-[calc(90vh-200px)] object-contain cursor-zoom-in"
                      onClick={handleZoomIn}
                      style={{
                        width: zoomLevel === 100 ? "auto" : `${zoomLevel}%`,
                        height: zoomLevel === 100 ? "auto" : `${zoomLevel}%`,
                      }}
                    />
                  </div>
                </div>
              ) : essayData.fileType === "text" ? (
                <div className="p-4">
                  <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-800">
                    {essayData.content}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12">
                  <FileText className="w-16 h-16 text-neutral-300 mb-4" />
                  <p className="text-neutral-600 mb-4">Unsupported file type</p>
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download to view
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
