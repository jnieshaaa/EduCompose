import React, { useState, useEffect } from "react";
import { Upload, FileText, Eye, BookOpen, Info, Loader2 } from "lucide-react";
import { motion, useAnimation, useInView } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import HeaderPublic from "../components/HeaderPublic";
import AuthModal from "../components/LoginModal";
import TextAnalysisModal from "../components/essay/TextAnalysisModal";
import { supabase } from "../lib/supabaseClient";
import { platformRubrics, getTypeBadgeColor } from "../data/rubricData";
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
      .is("created_by", null)
      .order("name", { ascending: true });

    if (!error && platformData && platformData.length > 0) {
      return platformData.map((r) => ({
        id: String(r.id),
        name: r.name,
      }));
    }

    // Fallback to hardcoded platform rubrics
    return (platformRubrics || []).map((r) => ({
      id: `platform-${r.id}`,
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
    navigate("/AnalysisResults", {
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
                      <label className={`hover:bg-support/20 text-gray-700 font-semibold px-6 py-2.5 rounded-full transition-all cursor-pointer flex items-center gap-2 text-sm ${
                        isProcessingOCR ? "opacity-50 cursor-not-allowed" : ""
                      }`}>
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
                            const isTextFile = file.name.toLowerCase().endsWith('.txt') || 
                                             file.name.toLowerCase().endsWith('.doc') || 
                                             file.name.toLowerCase().endsWith('.docx');
                            const isPdfOrImage = file.name.toLowerCase().endsWith('.pdf') ||
                                                file.type.startsWith('image/');

                            if (isTextFile) {
                              // Handle text files directly
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const content = event.target?.result as string;
                                setText(content);
                              };
                              reader.readAsText(file);
                            } else if (isPdfOrImage) {
                              // Handle PDF/image files with OCR
                              setIsProcessingOCR(true);
                              try {
                                const result = await ocrApi.extractTextFromFile(file);
                                if (result.text && result.text.trim()) {
                                  setText(result.text);
                                  // Show success message
                                  console.log(`OCR completed: ${result.word_count} words extracted (confidence: ${result.confidence})`);
                                } else {
                                  setOcrError("No text could be extracted from the file. Please ensure the file contains readable text.");
                                }
                              } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : "Failed to extract text from file";
                                setOcrError(errorMessage);
                                console.error("OCR error:", error);
                              } finally {
                                setIsProcessingOCR(false);
                                // Reset input
                                e.target.value = "";
                              }
                            } else {
                              setOcrError("Unsupported file type. Please upload a text file (.txt, .doc, .docx), PDF, or image file.");
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
