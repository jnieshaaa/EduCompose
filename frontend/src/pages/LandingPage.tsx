import React, { useState, useRef } from "react";
import { Upload, FileText, Eye } from "lucide-react";
import { motion } from "framer-motion";
import HeaderPublic from "../components/HeaderPublic";
import AuthModal from "../components/LoginModal";
import InlineAnalysisResults from "../components/essay/InlineAnalysisResults";
import TextAnalysisModal from "../components/essay/TextAnalysisModal";
import { analysisApi } from "../api";
import type { AnalysisResponse } from "../types/Essay";

const MIN_WORDS = 150;

const LandingPage: React.FC = () => {
  const [text, setText] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [analysis, setAnalysis] = useState<Omit<
    AnalysisResponse,
    "essay_id"
  > | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzedText, setAnalyzedText] = useState<string | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showTextAnalysisModal, setShowTextAnalysisModal] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const charCount = text.length;

  // Check if text has changed since last analysis
  const hasTextChanged = analyzedText !== null && text !== analyzedText;

  // Determine button text and behavior
  const showViewResult = analysis && !hasTextChanged && !loading;

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError("Please enter some text to analyze");
      return;
    }

    const currentWordCount = text.trim().split(/\s+/).length;
    if (currentWordCount < MIN_WORDS) {
      // Open TextAnalysisModal to show the word requirement guide
      setShowTextAnalysisModal(true);
      return;
    }

    // Reset previous results
    setAnalysis(null);
    setError(null);
    setLoading(true);
    setShowResultsModal(true);

    try {
      const currentText = text;
      const result = await analysisApi.analyzeText(
        text,
        "Essay Analysis",
        "comprehensive"
      );
      setAnalysis(result as Omit<AnalysisResponse, "essay_id">);
      setAnalyzedText(currentText);
      setShowResultsModal(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to analyze essay";
      setError(errorMessage);
      console.error("Error analyzing essay:", err);
      setAnalyzedText(null);
      setShowResultsModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    handleAnalyze();
  };

  const handleCloseResults = () => {
    // Only hide the modal, keep the analysis data
    setShowResultsModal(false);
    setError(null); // Clear error when closing
  };

  const handleViewResult = () => {
    setShowResultsModal(true);
    // Scroll to results after a brief delay to ensure modal is rendered
    setTimeout(() => {
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'>
      <HeaderPublic onLoginClick={() => setShowLogin(true)} />
      {showLogin && <AuthModal onClose={() => setShowLogin(false)} />}

      {/* Hero Section */}
      <div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className='mx-auto px-4 lg:px-6 xl:px-8'>
            <div className='flex flex-col items-center justify-center gap-3 lg:gap-3 w-full max-w-[90vw] m-8 m-auto'>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className='bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl mx-auto h-[70vh] flex flex-col'
              >
                <div className='relative flex-1'>
                  <textarea
                    placeholder='Paste your essay here to get started...'
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className='w-full h-full border-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none outline-none text-lg leading-relaxed px-2 py-3'
                    style={{
                      overflowY: "auto",
                    }}
                  />
                </div>

                <div className='flex justify-between items-center pt-2 border-t border-neutral-100'>
                  <div className='px-3 py-2 rounded text-sm'>
                    <span
                      className={`font-semibold ${
                        wordCount >= MIN_WORDS
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {wordCount}
                    </span>
                    <span className='text-gray-500'> Words </span>
                    <span className='text-gray-500'>
                      {charCount} Characters
                    </span>
                  </div>

                  <div className='flex gap-3'>
                    <label className='hover:bg-support/20 text-gray-700 font-semibold px-6 py-2.5 rounded-full transition-all cursor-pointer flex items-center gap-2 text-sm'>
                      <Upload className='w-4 h-4' />
                      Upload
                      <input
                        type='file'
                        accept='.txt,.doc,.docx'
                        className='hidden'
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
                          <Eye className='w-4 h-4' />
                          View Result
                        </>
                      ) : (
                        <>
                          <FileText className='w-4 h-4' />
                          Analyze Essay
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>

              {(loading || showResultsModal) && (
                <div ref={resultsRef}>
                  <InlineAnalysisResults
                    analysis={analysis}
                    loading={loading}
                    error={error}
                    onRetry={handleRetry}
                    onClose={handleCloseResults}
                    originalText={analyzedText || undefined}
                    isOpen={showResultsModal || loading}
                  />
                </div>
              )}

              {/* Text Analysis Modal for word requirement guide */}
              <TextAnalysisModal
                isOpen={showTextAnalysisModal}
                onClose={() => setShowTextAnalysisModal(false)}
                text={text}
                title='Essay Analysis'
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;
