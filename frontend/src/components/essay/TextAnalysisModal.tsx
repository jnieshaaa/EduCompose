import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import Modal from "../ui/Modal";
import KnowledgeGraphLoader from "../ui/KnowledgeGraphLoader";
import type { AnalysisResponse } from "../../types/Essay";
import { analysisApi } from "../../api";

interface TextAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  title?: string;
}

const MIN_WORDS = 150;

const detectLowQualityText = (input: string): string | null => {
  const tokens = input.split(/\s+/).filter(Boolean);
  const alphaTokens = tokens.filter((token) => /[a-zA-Z]/.test(token));
  const cleanedAlphaTokens = alphaTokens.map((token) =>
    token.replace(/[^a-zA-Z]/g, "")
  );
  const alphaWordCount = alphaTokens.length;
  const uniqueWords = new Set(
    cleanedAlphaTokens.map((token) => token.toLowerCase())
  );

  const lexicalDiversity =
    alphaWordCount > 0 ? uniqueWords.size / alphaWordCount : 0;
  const avgWordLength =
    alphaWordCount > 0
      ? cleanedAlphaTokens.reduce((sum, token) => sum + token.length, 0) /
        alphaWordCount
      : 0;

  const sentenceCount = input
    .split(/[.!?]+|\n+/)
    .map((segment) => segment.trim())
    .filter((segment) => /[a-zA-Z]{3,}/.test(segment)).length;

  const distinctLetters = new Set(
    cleanedAlphaTokens.join("").toLowerCase().split("")
  ).size;

  if (sentenceCount < 2) {
    return "Please include at least two complete sentences with proper punctuation before running the analysis.";
  }
  if (lexicalDiversity < 0.15) {
    return "The text repeats the same word too many times. Please provide a real paragraph with varied vocabulary.";
  }
  if (avgWordLength < 2.5) {
    return "The text is mostly made of extremely short fragments. Use full words and sentences so we can score the writing.";
  }
  if (distinctLetters < 5) {
    return "The text does not include enough unique letters to be considered meaningful writing.";
  }

  return null;
};

const TextAnalysisModal: React.FC<TextAnalysisModalProps> = ({
  isOpen,
  onClose,
  text,
  title = "Essay Analysis",
}) => {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Omit<
    AnalysisResponse,
    "essay_id"
  > | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && text && !analysis && !loading) {
      // Auto-trigger analysis when modal opens
      handleAnalyze();
    }
    // Reset analysis when modal closes
    if (!isOpen) {
      setAnalysis(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleAnalyze = async () => {
    if (!text.trim() || text.trim().split(/\s+/).length < MIN_WORDS) {
      setError(`Essay must be at least ${MIN_WORDS} words for analysis`);
      return;
    }

    // Check for quality issues
    const qualityIssue = detectLowQualityText(text);
    if (qualityIssue) {
      setError(qualityIssue);
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analysisApi.analyzeText(
        text,
        title,
        "comprehensive",
        undefined // No rubric for modal analysis
      );
      // Navigate to AnalysisResults page with the analysis data
      navigate("/Teacher/AnalysisResults", {
        state: {
          analysis: result as Omit<AnalysisResponse, "essay_id">,
          text: text,
          title: title,
        },
      });
      // Close the modal
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to analyze essay";
      setError(errorMessage);
      console.error("Error analyzing essay:", err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        className="max-h-[90vh]"
        contentClassName="flex flex-col items-center justify-center py-12"
        blackBackground={true}
        closeOnBackdropClick={false}
      >
        <KnowledgeGraphLoader size="md" className="mb-6" />
        <p className="text-lg font-medium text-white mb-2 drop-shadow-lg">
          Analyzing your essay...
        </p>
        <p className="text-sm text-neutral-200 drop-shadow-md">
          Building knowledge graph connections...
        </p>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="md"
        className="max-h-[90vh]"
        closeOnBackdropClick={true}
      >
        <div className="flex flex-col items-center text-center p-8">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h4 className="text-xl font-semibold text-neutral-900 mb-3">
            Analysis Error
          </h4>
          <p className="text-neutral-600">{error}</p>
          {text.trim().split(/\s+/).length < MIN_WORDS && (
            <p className="text-sm text-neutral-500 mt-2">
              Your essay has {text.trim().split(/\s+/).length} words. Please add
              at least {MIN_WORDS - text.trim().split(/\s+/).length} more words.
            </p>
          )}
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  // Only show loading state, results will be on AnalysisResults page
  return null;
};

export default TextAnalysisModal;
