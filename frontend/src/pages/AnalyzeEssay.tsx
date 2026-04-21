import React, { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Eye,
  BookOpen,
  Info,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion, useAnimation, useInView } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import HeaderPublic from "../components/landing/HeaderPublic";
import AuthModal from "../components/LoginModal";
import TextAnalysisModal from "../components/essay/TextAnalysisModal";
import Modal from "../components/ui/Modal";
import { supabase } from "../lib/supabaseClient";
import { getTypeBadgeColor } from "../utils/rubricUtils";
import { platformRubrics } from "../components/rubrics/types";
import type { PlatformRubric } from "../components/rubrics/types";
import { ocrApi } from "../api";

const MIN_WORDS = 150;

// Function to fetch platform rubrics (works without authentication)
const fetchPlatformRubrics = async (): Promise<
  { id: string; name: string }[]
> => {
  try {
    // Try to fetch from Supabase (public read access)
    const { data: platformData, error } = await supabase
      .from("rubrics")
      .select("id, name")
      .is("teacher_id", null)
      .order("name", { ascending: true });

    if (!error && platformData && platformData.length > 0) {
      // Platform rubrics found in database - use actual database IDs
      return platformData.map((r) => ({
        id: String(r.id), // Use actual database ID, not "platform-" prefix
        name: r.name,
      }));
    }

    // Fallback to hardcoded platform rubrics (these won't work with backend)
    // These are only for display - backend can't use them
    return (platformRubrics || []).map((r) => ({
      id: `platform-${r.id}`, // Keep prefix for hardcoded rubrics
      name: r.name,
    }));
  } catch (err) {
    console.error("Error loading platform rubrics:", err);
    // Fallback to hardcoded platform rubrics
    return (platformRubrics || []).map((r) => ({
      id: `platform-${r.id}`,
      name: r.name,
    }));
  }
};

const AnalyzeEssay: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [showTextAnalysisModal, setShowTextAnalysisModal] = useState(false);
  const [availableRubrics, setAvailableRubrics] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string>("");
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(false);
  const [showRubricPreview, setShowRubricPreview] = useState(false);
  const [previewRubric, setPreviewRubric] = useState<PlatformRubric | null>(
    null
  );
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<{
    text: string;
    word_count: number;
    confidence: number;
    page_count: number;
    filename: string;
  } | null>(null);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [processingFileName, setProcessingFileName] = useState<string>("");

  // Essay box animation
  const essayBoxRef = React.useRef<HTMLDivElement>(null);
  const essayBoxControls = useAnimation();
  const isEssayBoxInView = useInView(essayBoxRef, { once: false, amount: 0.3 });

  // Load platform rubrics on mount
  useEffect(() => {
    const loadRubrics = async () => {
      setIsLoadingRubrics(true);
      try {
        const rubrics = await fetchPlatformRubrics();
        setAvailableRubrics(rubrics);
        // Don't auto-select any rubric - let user choose
      } catch (error) {
        console.error("Error loading rubrics:", error);
      } finally {
        setIsLoadingRubrics(false);
      }
    };
    loadRubrics();
  }, []); // Remove selectedRubricId dependency

  // Show login modal if redirected from a protected route
  useEffect(() => {
    if (location.state?.from) {
      setShowLogin(true);
    }
    // Restore text if navigating back from AnalysisResults
    if (location.state?.text) {
      setText(location.state.text);
    }
    // Restore rubric if provided
    if (location.state?.rubricId) {
      setSelectedRubricId(location.state.rubricId);
    }
  }, [location.state]);

  // Essay box animation - animates once when in view, fades out when leaving
  useEffect(() => {
    if (isEssayBoxInView) {
      essayBoxControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: "easeOut" },
      });
    } else {
      essayBoxControls.start({
        opacity: 0,
        transition: { duration: 0.5, ease: "easeOut" },
      });
    }
  }, [isEssayBoxInView, essayBoxControls]);

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const charCount = text.length;

  // Determine button text and behavior
  const showViewResult = false; // Always show analyze button

  const handleAnalyze = async () => {
    if (!text.trim()) {
      // Show error in a simple way or just return
      return;
    }

    // Navigate to AnalysisResults page with text in state
    // The loading will happen on the AnalysisResults page
    navigate("/Teacher/AnalysisResults", {
      state: {
        text: text,
        title: "Essay Analysis",
        rubricId: selectedRubricId || undefined, // Pass rubric ID if selected
      },
    });
  };

  const handleViewResult = () => {
    // Open the modal to view results
    if (text.trim()) {
      setShowTextAnalysisModal(true);
    }
  };

  const handlePreviewRubric = () => {
    if (!selectedRubricId) return;

    // Find the rubric from platform rubrics
    const rubric = platformRubrics.find(
      (r) => `platform-${r.id}` === selectedRubricId
    );
    if (rubric) {
      setPreviewRubric(rubric);
      setShowRubricPreview(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <HeaderPublic onLoginClick={() => setShowLogin(true)} />
      {showLogin && <AuthModal onClose={() => setShowLogin(false)} />}

      {/* Hero Section */}
      <div id="hero" className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full"
        >
          <div className="mx-auto px-4 lg:px-6 xl:px-8">
            <div className="flex flex-col items-center justify-center gap-3 lg:gap-3 w-full max-w-[90vw] my-10 m-auto">
              <motion.div
                ref={essayBoxRef}
                initial={{ opacity: 0, y: 30 }}
                animate={essayBoxControls}
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl mx-auto h-[70vh] mb-5 flex flex-col"
              >
                <div className="relative flex-1">
                  <textarea
                    placeholder="Paste your essay here to get started..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full h-full border-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none outline-none text-lg leading-relaxed px-2 py-3"
                    style={{
                      overflowY: "auto",
                    }}
                  />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                  <div className="flex flex-col gap-1">
                    <div className="px-3 py-2 rounded text-sm">
                      <span
                        className={`font-semibold ${
                          wordCount >= MIN_WORDS
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {wordCount}
                      </span>
                      <span className="text-gray-500"> Words </span>
                      <span className="text-gray-500">
                        {charCount} Characters
                      </span>
                    </div>
                    {ocrError && (
                      <div className="px-3 text-xs text-red-600 bg-red-50 rounded py-1">
                        {ocrError}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 items-center">
                    {/* Rubric Selector */}
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-gray-600" />
                      <select
                        value={selectedRubricId}
                        onChange={(e) => setSelectedRubricId(e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={
                          isLoadingRubrics || availableRubrics.length === 0
                        }
                      >
                        {isLoadingRubrics ? (
                          <option value="">Loading rubrics...</option>
                        ) : availableRubrics.length === 0 ? (
                          <option value="">No rubrics available</option>
                        ) : (
                          <>
                            <option value="">None (Default Analysis)</option>
                            {availableRubrics.map((rubric) => (
                              <option key={rubric.id} value={rubric.id}>
                                {rubric.name}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      {selectedRubricId && (
                        <button
                          onClick={handlePreviewRubric}
                          className="p-1.5 text-gray-600 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Preview rubric details"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <label
                        className={`hover:bg-support/20 text-gray-700 font-semibold px-6 py-2.5 rounded-full transition-all cursor-pointer flex items-center gap-2 text-sm ${
                          isProcessingOCR ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {isProcessingOCR ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload
                          </>
                        )}
                        <input
                          type="file"
                          accept=".txt,.doc,.docx,.pdf,.jpg,.jpeg,.png,.bmp,.tiff"
                          className="hidden"
                          disabled={isProcessingOCR}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            // Reset error
                            setOcrError(null);

                            // Check file type
                            const isTextFile =
                              file.name.toLowerCase().endsWith(".txt") ||
                              file.name.toLowerCase().endsWith(".doc") ||
                              file.name.toLowerCase().endsWith(".docx");

                            const isPdfOrImage =
                              file.name.toLowerCase().endsWith(".pdf") ||
                              file.name.toLowerCase().endsWith(".jpg") ||
                              file.name.toLowerCase().endsWith(".jpeg") ||
                              file.name.toLowerCase().endsWith(".png") ||
                              file.name.toLowerCase().endsWith(".bmp") ||
                              file.name.toLowerCase().endsWith(".tiff");

                            if (isTextFile) {
                              // Handle text files directly
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const content = event.target?.result as string;
                                setText(content);
                              };
                              reader.readAsText(file);
                            } else if (isPdfOrImage) {
                              // Use OCR for PDF and image files
                              setIsProcessingOCR(true);
                              setShowOcrModal(true);
                              setOcrError(null);
                              setOcrResult(null);
                              setProcessingFileName(file.name);
                              try {
                                const result = await ocrApi.extractTextFromFile(
                                  file
                                );
                                // Debug log to check what we're receiving
                                // console.log("OCR Result:", result);

                                // Ensure word_count is calculated if missing or 0 but text exists
                                if (result.text && result.text.trim()) {
                                  const calculatedWordCount = result.text
                                    .trim()
                                    .split(/\s+/).length;
                                  if (
                                    !result.word_count ||
                                    result.word_count === 0
                                  ) {
                                    result.word_count = calculatedWordCount;
                                  }
                                }

                                setOcrResult(result);
                                setText(result.text);
                                setOcrError(null);
                              } catch (error) {
                                console.error("OCR error:", error);
                                setOcrError(
                                  error instanceof Error
                                    ? error.message
                                    : "Failed to extract text from file. Please try a text file instead."
                                );
                              } finally {
                                setIsProcessingOCR(false);
                                setProcessingFileName("");
                                e.target.value = ""; // Reset file input
                              }
                            } else {
                              setOcrError(
                                "Unsupported file type. Please upload a text file (.txt, .doc, .docx), PDF, or image file."
                              );
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>

                      <button
                        onClick={
                          showViewResult ? handleViewResult : handleAnalyze
                        }
                        className={`font-semibold px-6 py-2.5 rounded-full transition-all duration-300 flex items-center gap-2 text-sm ${
                          !showViewResult && wordCount < MIN_WORDS
                            ? "bg-neutral-300/50"
                            : "bg-primary text-white transform hover:bg-primary-100 hover:shadow-lg "
                        }`}
                      >
                        {showViewResult ? (
                          <>
                            <Eye className="w-4 h-4" />
                            View Result
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            Analyze Essay
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Text Analysis Modal for word requirement guide */}
      <TextAnalysisModal
        isOpen={showTextAnalysisModal}
        onClose={() => setShowTextAnalysisModal(false)}
        text={text}
        title="Essay Analysis"
      />

      {/* OCR Processing Modal */}
      <Modal
        isOpen={showOcrModal}
        onClose={() => {
          if (!isProcessingOCR) {
            setShowOcrModal(false);
          }
        }}
        title="Processing File"
        size="md"
        closeOnBackdropClick={!isProcessingOCR}
      >
        <div className="flex flex-col items-center justify-center py-8 px-4">
          {isProcessingOCR ? (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                Extracting text from file...
              </h3>
              <p className="text-sm text-neutral-600 text-center">
                This may take a few moments depending on the file size
              </p>
              {processingFileName && (
                <p className="text-xs text-neutral-500 mt-2">
                  Processing: {processingFileName}
                </p>
              )}
            </>
          ) : ocrResult ? (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                Text extracted successfully!
              </h3>
              <div className="w-full mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Words extracted:</span>
                  <span className="font-semibold text-neutral-900">
                    {ocrResult.word_count}
                  </span>
                </div>
                {ocrResult.page_count > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Pages processed:</span>
                    <span className="font-semibold text-neutral-900">
                      {ocrResult.page_count}
                    </span>
                  </div>
                )}
                {ocrResult.confidence < 100 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Confidence:</span>
                    <span className="font-semibold text-neutral-900">
                      {ocrResult.confidence.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6 w-full">
                <button
                  onClick={() => {
                    setShowOcrModal(false);
                  }}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-medium"
                >
                  Review Text
                </button>
                <button
                  onClick={() => {
                    setShowOcrModal(false);
                    // Automatically proceed to analysis
                    handleAnalyze();
                  }}
                  disabled={ocrResult.word_count < MIN_WORDS}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                    ocrResult.word_count >= MIN_WORDS
                      ? "bg-primary text-white hover:bg-primary-600"
                      : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Analyze Now
                </button>
              </div>
              {ocrResult.word_count < MIN_WORDS && (
                <p className="text-xs text-red-600 mt-2 text-center">
                  Text must be at least {MIN_WORDS} words to analyze (extracted:{" "}
                  {ocrResult.word_count} words)
                </p>
              )}
            </>
          ) : ocrError ? (
            <>
              <XCircle className="w-12 h-12 text-red-600 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                Extraction Failed
              </h3>
              <p className="text-sm text-neutral-600 text-center mb-4">
                {ocrError}
              </p>
              <button
                onClick={() => {
                  setShowOcrModal(false);
                  setOcrError(null);
                }}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                Close
              </button>
            </>
          ) : null}
        </div>
      </Modal>

      {/* Rubric Preview Modal */}
      {showRubricPreview && previewRubric && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {previewRubric.name}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {previewRubric.description}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeBadgeColor(
                        previewRubric.type
                      )}`}
                    >
                      {previewRubric.type}
                    </span>
                    <span className="text-sm text-gray-500">
                      {previewRubric.criteria.length} criteria
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowRubricPreview(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="border border-neutral-200 rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-600">
                      <th className="px-4 py-3 text-left text-sm font-semibold uppercase w-1/4">
                        Criteria
                      </th>
                      <th
                        colSpan={4}
                        className="px-4 py-3 text-left text-sm font-semibold uppercase"
                      >
                        Grade and Descriptors
                      </th>
                    </tr>
                    <tr className="bg-neutral-50 text-neutral-600">
                      <th className="px-4 py-1 text-left text-xs font-medium uppercase w-1/4"></th>
                      <th className="px-4 py-1 text-center text-xs font-medium uppercase border-l border-neutral-200">
                        4 pts
                      </th>
                      <th className="px-4 py-1 text-center text-xs font-medium uppercase border-l border-neutral-200">
                        3 pts
                      </th>
                      <th className="px-4 py-1 text-center text-xs font-medium uppercase border-l border-neutral-200">
                        2 pts
                      </th>
                      <th className="px-4 py-1 text-center text-xs font-medium uppercase border-l border-neutral-200">
                        1 pts
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {previewRubric.criteria.map((criteria) => (
                      <tr key={criteria.id}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 w-1/4">
                          {criteria.title}
                        </td>
                        {[4, 3, 2, 1].map((point) => {
                          const scoreMatch = criteria.scores.find(
                            (score) => score.points === point
                          );
                          return (
                            <td
                              key={`${criteria.id}-${point}`}
                              className="px-4 py-4 text-sm text-neutral-500 border-l border-neutral-200"
                            >
                              {scoreMatch ? (
                                <div>
                                  <span className="font-medium text-neutral-700">
                                    {scoreMatch.title}
                                  </span>
                                  {scoreMatch.description && (
                                    <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                                      {scoreMatch.description}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-neutral-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section Description */}
      <motion.div
        id="hero-bottom"
        className="container mx-auto px-6 text-center mt-6"
        initial={{ opacity: 0 }}
        animate={essayBoxControls}
      >
        <p className="text-xl md:text-2xl">
          Knowledge Graph–Enhanced NLP for Teacher-Assisted Essay Evaluation
        </p>
        <p className="mt-4 max-w-3xl mx-auto text-lg">
          Empowering educators with AI-driven insights to provide deeper, more
          effective feedback on student writing, without replacing the human
          touch.
        </p>
      </motion.div>
    </div>
  );
};

export default AnalyzeEssay;
