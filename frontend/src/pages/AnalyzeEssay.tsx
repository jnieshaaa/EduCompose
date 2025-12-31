import React, { useState, useEffect } from "react";
import { Upload, FileText, Eye, BookOpen } from "lucide-react";
import { motion, useAnimation, useInView } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import HeaderPublic from "../components/HeaderPublic";
import AuthModal from "../components/LoginModal";
import TextAnalysisModal from "../components/essay/TextAnalysisModal";
import { supabase } from "../lib/supabaseClient";
import { platformRubrics } from "../data/rubricData";

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
        // Default to first platform rubric if available
        if (rubrics.length > 0 && !selectedRubricId) {
          setSelectedRubricId(rubrics[0].id);
        }
      } catch (error) {
        console.error("Error loading rubrics:", error);
      } finally {
        setIsLoadingRubrics(false);
      }
    };
    loadRubrics();
  }, [selectedRubricId]);

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
                    </div>

                    <div className="flex gap-3">
                      <label className="hover:bg-support/20 text-gray-700 font-semibold px-6 py-2.5 rounded-full transition-all cursor-pointer flex items-center gap-2 text-sm">
                        <Upload className="w-4 h-4" />
                        Upload
                        <input
                          type="file"
                          accept=".txt,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const content = event.target?.result as string;
                              setText(content);
                            };
                            reader.readAsText(file);
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
