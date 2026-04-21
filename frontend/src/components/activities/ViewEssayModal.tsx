import { useState, useEffect } from "react";
import {
  X,
  Download,
  Loader2,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  Type,
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
  const [activeTab, setActiveTab] = useState<"file" | "text">("file");

  useEffect(() => {
    if (isOpen && studentId && activityId) {
      loadEssay();
    } else {
      // Reset state when modal closes
      setEssayData(null);
      setError(null);
      setZoomLevel(100);
      setActiveTab("file");
    }
  }, [isOpen, studentId, activityId]);

  useEffect(() => {
    if (essayData) {
      // Default to "text" if there is no file
      if (!essayData.fileUrl && essayData.content) {
        setActiveTab("text");
      } else {
        setActiveTab("file");
      }
    }
  }, [essayData]);

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

  const hasBoth = !!(essayData?.fileUrl && essayData?.content);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Submission Viewer - ${studentName}`}
      size="xl"
      contentClassName="p-0"
    >
      <div className="flex flex-col h-[85vh] bg-neutral-50">
        {/* Header with Tabs */}
        <div className="bg-white border-b border-neutral-200">
          <div className="flex items-center justify-between p-4">
            <div>
              <h3 className="font-bold text-neutral-900 leading-tight">
                {essayData?.title || "Essay Submission"}
              </h3>
              <p className="text-xs text-neutral-500 font-medium">{studentName}</p>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === "file" && essayData?.fileType === "image" && (
                <div className="flex items-center gap-1 border-r border-neutral-100 pr-3 mr-1">
                  <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 50} className="w-8 h-8 p-0">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-[10px] font-bold text-neutral-600 w-10 text-center uppercase tracking-tighter">
                    {zoomLevel}%
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 300} className="w-8 h-8 p-0">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleResetZoom} disabled={zoomLevel === 100} className="w-8 h-8 p-0">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {essayData?.fileUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl border-neutral-200"
                >
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Download
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose} className="w-9 h-9 p-0 rounded-xl hover:bg-neutral-100 transition-colors">
                <X className="w-5 h-5 text-neutral-400" />
              </Button>
            </div>
          </div>

          {/* Tab Selection */}
          {hasBoth && (
            <div className="flex px-4 gap-1">
              <button
                onClick={() => setActiveTab("file")}
                className={`flex items-center gap-2 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all duration-200 ${
                  activeTab === "file"
                    ? "border-primary text-primary"
                    : "border-transparent text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Original File
              </button>
              <button
                onClick={() => setActiveTab("text")}
                className={`flex items-center gap-2 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all duration-200 ${
                  activeTab === "text"
                    ? "border-primary text-primary"
                    : "border-transparent text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                Extracted Text
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Retrieving submission...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-neutral-300" />
              </div>
              <h4 className="text-neutral-900 font-bold mb-2">Something went wrong</h4>
              <p className="text-sm text-neutral-500 max-w-xs mx-auto mb-6">{error}</p>
              <Button variant="primary" onClick={loadEssay} className="rounded-xl px-8 py-2.5 font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
                Try again
              </Button>
            </div>
          ) : essayData ? (
            <div className="h-full">
              {activeTab === "file" && essayData.fileUrl ? (
                <div className="h-full">
                  {essayData.fileType === "pdf" ? (
                    <iframe
                      src={essayData.fileUrl}
                      className="w-full h-full border-0 bg-neutral-100"
                      title={essayData.title}
                    />
                  ) : essayData.fileType === "image" ? (
                    <div className="h-full flex items-center justify-center p-8 bg-neutral-100 overflow-auto">
                      <img
                        src={essayData.fileUrl}
                        alt={essayData.title}
                        className="max-w-full shadow-2xl rounded-sm transition-transform duration-300 ease-out"
                        style={{
                          transform: `scale(${zoomLevel / 100})`,
                          cursor: "zoom-in"
                        }}
                        onClick={handleZoomIn}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 h-full text-center">
                      <div className="w-20 h-20 rounded-3xl bg-neutral-100 flex items-center justify-center mb-6">
                        <FileText className="w-10 h-10 text-neutral-300" />
                      </div>
                      <h4 className="text-neutral-900 font-bold mb-2">Alternative View Required</h4>
                      <p className="text-sm text-neutral-500 max-w-sm mb-6">We can't display this file type directly in the browser.</p>
                      <Button variant="primary" onClick={handleDownload} className="rounded-xl px-8 font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
                        <Download className="w-4 h-4 mr-2" />
                        Download File
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 max-w-3xl mx-auto h-full overflow-auto">
                  <div className="bg-white p-12 shadow-sm border border-neutral-200 rounded-lg min-h-full">
                    <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-800 font-sans">
                      {essayData.content || "No text available for this submission."}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
