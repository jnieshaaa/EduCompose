import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  TrendingUp,
  Brain,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Target,
  ArrowRight,
  Award,
  ArrowLeft,
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import ProgressBar from "../components/ui/ProgressBar";
import KnowledgeGraphLoader from "../components/ui/KnowledgeGraphLoader";
import ArgumentKnowledgeGraph from "../components/essay/ArgumentKnowledgeGraph";
import Modal from "../components/ui/Modal";
import type {
  AnalysisResponse,
  DiagnosticRecommendation,
  GrammarError,
} from "../types/Essay";
import { analysisApi } from "../api";

type HighlightError = GrammarError & {
  offset: number;
  errorLength: number;
};

const STORAGE_KEY = "essay_analysis_results";

const AnalysisResults: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [analysis, setAnalysis] = useState<Omit<
    AnalysisResponse,
    "essay_id"
  > | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "analysis" | "essay" | "recommendations"
  >("analysis");
  const [originalText, setOriginalText] = useState<string>("");
  const [selectedError, setSelectedError] = useState<HighlightError | null>(
    null
  );
  const [analysisKey, setAnalysisKey] = useState<string>(""); // Key to track when analysis changes

  // Stable references to prevent recalculation
  const stableAnalysisRef = useRef<Omit<AnalysisResponse, "essay_id"> | null>(null);
  const stableTextRef = useRef<string>("");
  const stableHighlightDataRef = useRef<{ html: string | null; errors: HighlightError[] } | null>(null);

  const handleAnalyze = async (
    text: string,
    title: string,
    essayId?: number
  ) => {
    if (!text.trim() || text.trim().split(/\s+/).length < 150) {
      setError("Essay must be at least 150 words for analysis");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      let result;
      if (essayId) {
        // Analyze by essay ID
        result = await analysisApi.analyzeEssay(essayId, "comprehensive");
      } else {
        // Analyze by text
        result = await analysisApi.analyzeText(text, title, "comprehensive");
      }
      const analysisResult = result as Omit<AnalysisResponse, "essay_id">;
      
      // Create a deep clone to prevent mutations
      const stableAnalysis = JSON.parse(JSON.stringify(analysisResult));
      const stableText = text;
      
      // Create a unique key for this analysis (based on text hash and timestamp)
      const newAnalysisKey = `${stableText.substring(0, 50)}-${Date.now()}`;
      
      // Store stable references
      stableAnalysisRef.current = stableAnalysis;
      stableTextRef.current = stableText;
      stableHighlightDataRef.current = null; // Reset to force recalculation with new data
      
      setAnalysis(stableAnalysis);
      setAnalysisKey(newAnalysisKey); // Trigger recalculation
      
      // Save to localStorage for persistence
      try {
        const dataToSave = {
          analysis: stableAnalysis,
          text: stableText,
          title: title || "Essay Analysis",
          timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (storageError) {
        console.warn("Failed to save analysis to localStorage:", storageError);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to analyze essay";
      setError(errorMessage);
      console.error("Error analyzing essay:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get analysis data from location state, localStorage, or trigger new analysis
  useEffect(() => {
    // Prevent re-running if we already have analysis data
    if (analysis && originalText) {
      return;
    }

    const state = location.state as {
      analysis?: Omit<AnalysisResponse, "essay_id">;
      text?: string;
      title?: string;
      essayId?: number;
      error?: string;
    } | null;

    if (state?.error) {
      setError(state.error);
      if (state.text) {
        setOriginalText(state.text);
      }
      return;
    }

    if (state?.analysis) {
      // Analysis already provided - create stable references
      const stableAnalysis = JSON.parse(JSON.stringify(state.analysis));
      const stableText = state.text || "";
      
      // Create a unique key for this analysis
      const newAnalysisKey = `${stableText.substring(0, 50)}-${Date.now()}`;
      
      stableAnalysisRef.current = stableAnalysis;
      stableTextRef.current = stableText;
      stableHighlightDataRef.current = null; // Reset to force recalculation
      
      setAnalysis(stableAnalysis);
      setAnalysisKey(newAnalysisKey); // Trigger recalculation
      if (state.text) {
        setOriginalText(stableText);
        // Save to localStorage
        try {
          const dataToSave = {
            analysis: stableAnalysis,
            text: stableText,
            title: state.title || "Essay Analysis",
            timestamp: Date.now(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (storageError) {
          console.warn("Failed to save analysis to localStorage:", storageError);
        }
      }
    } else if (state?.text) {
      // Need to analyze text - ensure text is set before analyzing
      const textToAnalyze = state.text;
      setOriginalText(textToAnalyze);
      handleAnalyze(textToAnalyze, state.title || "Essay Analysis", state.essayId);
    } else {
      // No state provided - try to load from localStorage
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          // Check if data is not too old (e.g., within 24 hours)
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          if (parsed.timestamp && Date.now() - parsed.timestamp < maxAge) {
            // Create stable references
            const stableAnalysis = JSON.parse(JSON.stringify(parsed.analysis));
            const stableText = parsed.text || "";
            
            // Create a unique key for this analysis
            const newAnalysisKey = `${stableText.substring(0, 50)}-${parsed.timestamp || Date.now()}`;
            
            stableAnalysisRef.current = stableAnalysis;
            stableTextRef.current = stableText;
            stableHighlightDataRef.current = null; // Reset to force recalculation
            
            setAnalysis(stableAnalysis);
            setOriginalText(stableText);
            setAnalysisKey(newAnalysisKey); // Trigger recalculation
            return;
          } else {
            // Data is too old, remove it
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (storageError) {
        console.warn("Failed to load analysis from localStorage:", storageError);
      }
      
      // No data available, redirect home
      navigate("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Clear selected error when switching tabs
  useEffect(() => {
    setSelectedError(null);
  }, [activeTab]);

  // Export analysis results to PDF
  const handleExportPDF = () => {
    if (!analysis || !originalText) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Helper function to add a new page if needed
    const checkPageBreak = (requiredHeight: number) => {
      if (yPosition + requiredHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Essay Analysis Report", margin, yPosition);
    yPosition += 15;

    // Date and word count
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const dateStr = analysis.generated_at
      ? new Date(analysis.generated_at).toLocaleString()
      : new Date().toLocaleString();
    doc.text(`Generated: ${dateStr}`, margin, yPosition);
    yPosition += 5;
    if (analysis.word_count) {
      doc.text(`Word Count: ${analysis.word_count}`, margin, yPosition);
      yPosition += 10;
    } else {
      yPosition += 5;
    }

    // Overall Score
    checkPageBreak(20);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Overall Score", margin, yPosition);
    yPosition += 8;
    doc.setFontSize(24);
    const overallScore = analysis.scores?.overall || 0;
    const scoreColor = overallScore >= 80 ? [34, 197, 94] : overallScore >= 60 ? [234, 179, 8] : [239, 68, 68];
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.text(`${overallScore.toFixed(1)}/100`, margin, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 15;

    // Score Breakdown
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Score Breakdown", margin, yPosition);
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const scores = analysis.scores || {};
    const scoreLabels = [
      { key: "grammar", label: "Grammar" },
      { key: "readability", label: "Readability" },
      { key: "coherence", label: "Coherence" },
      { key: "argument_strength", label: "Argument Strength" },
      { key: "knowledge_graph", label: "Knowledge Graph" },
    ];

    scoreLabels.forEach(({ key, label }) => {
      checkPageBreak(8);
      const score = scores[key as keyof typeof scores] || 0;
      doc.text(`${label}: ${score.toFixed(1)}/100`, margin + 5, yPosition);
      yPosition += 6;
    });
    yPosition += 5;

    // Grammar Analysis
    if (analysis.detailed_analysis?.grammar) {
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Grammar Analysis", margin, yPosition);
      yPosition += 10;

      const grammar = analysis.detailed_analysis.grammar;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      checkPageBreak(8);
      doc.text(`Score: ${grammar.score?.toFixed(1) || 0}/100`, margin, yPosition);
      yPosition += 6;
      
      checkPageBreak(8);
      doc.text(`Error Count: ${grammar.error_count || 0}`, margin, yPosition);
      yPosition += 10;

      // Group errors by type
      if (grammar.errors && grammar.errors.length > 0) {
        const errorGroups: Record<string, number> = {};
        grammar.errors.forEach((error) => {
          const type = error.type || "grammar";
          errorGroups[type] = (errorGroups[type] || 0) + 1;
        });

        doc.setFont("helvetica", "bold");
        doc.text("Errors by Type:", margin, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "normal");

        Object.entries(errorGroups).forEach(([type, count]) => {
          checkPageBreak(6);
          doc.text(`  • ${type}: ${count}`, margin + 5, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      }
    }

    // Readability Analysis
    if (analysis.detailed_analysis?.readability) {
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Readability Analysis", margin, yPosition);
      yPosition += 10;

      const readability = analysis.detailed_analysis.readability;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      checkPageBreak(8);
      doc.text(`Flesch Reading Ease: ${readability.flesch_reading_ease?.toFixed(1) || 0}`, margin, yPosition);
      yPosition += 6;
      
      checkPageBreak(8);
      doc.text(`Grade Level: ${readability.flesch_kincaid_grade?.toFixed(1) || 0}`, margin, yPosition);
      yPosition += 6;
      
      checkPageBreak(8);
      doc.text(`Lexical Diversity: ${(readability.lexical_diversity * 100)?.toFixed(1) || 0}%`, margin, yPosition);
      yPosition += 10;
    }

    // Recommendations
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Recommendations", margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      analysis.recommendations.forEach((rec, index) => {
        checkPageBreak(15);
        const recText = typeof rec === "string" ? rec : rec.message || rec.recommendation || "";
        const lines = doc.splitTextToSize(`${index + 1}. ${recText}`, maxWidth - 10);
        lines.forEach((line: string) => {
          checkPageBreak(6);
          doc.text(line, margin + 5, yPosition);
          yPosition += 5;
        });
        yPosition += 2;
      });
      yPosition += 5;
    }

    // Essay Text
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Essay Text", margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Split essay text into lines that fit the page
    const essayLines = doc.splitTextToSize(originalText, maxWidth);
    essayLines.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });

    // Save the PDF
    const fileName = `essay-analysis-${Date.now()}.pdf`;
    doc.save(fileName);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "error";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "neutral";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="w-4 h-4" />;
      case "medium":
        return <AlertCircle className="w-4 h-4" />;
      case "low":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  // Category colors for grammar errors
  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> =
      {
        grammar: {
          bg: "bg-red-50",
          text: "text-red-700",
          border: "border-red-200",
        },
        capitalization: {
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
        },
        word_choice: {
          bg: "bg-purple-50",
          text: "text-purple-700",
          border: "border-purple-200",
        },
        spelling: {
          bg: "bg-orange-50",
          text: "text-orange-700",
          border: "border-orange-200",
        },
        punctuation: {
          bg: "bg-yellow-50",
          text: "text-yellow-700",
          border: "border-yellow-200",
        },
      };
    return colors[category.toLowerCase()] || colors.grammar;
  };

  // Get highlight color for error type
  const getHighlightColor = (category: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      grammar: {
        bg: "rgba(239, 68, 68, 0.35)", // red
        text: "#991b1b",
      },
      capitalization: {
        bg: "rgba(59, 130, 246, 0.35)", // blue
        text: "#1e40af",
      },
      word_choice: {
        bg: "rgba(168, 85, 247, 0.35)", // purple
        text: "#6b21a8",
      },
      spelling: {
        bg: "rgba(249, 115, 22, 0.35)", // orange
        text: "#9a3412",
      },
      punctuation: {
        bg: "rgba(234, 179, 8, 0.35)", // yellow
        text: "#854d0e",
      },
    };
    return colors[category.toLowerCase()] || colors.grammar;
  };

  // Process grammar errors for highlighting - use stable references
  const highlightData = useMemo(() => {
    // Use stable refs if available, otherwise fall back to state
    const currentAnalysis = stableAnalysisRef.current || analysis;
    const currentText = stableTextRef.current || originalText;
    
    // If we have cached highlight data and analysis/text haven't changed, return cached
    if (stableHighlightDataRef.current && 
        stableAnalysisRef.current === currentAnalysis && 
        stableTextRef.current === currentText) {
      return stableHighlightDataRef.current;
    }
    
    const grammarErrors = currentAnalysis?.detailed_analysis?.grammar?.errors ?? [];

    if (!currentAnalysis || !currentText || grammarErrors.length === 0) {
      const result = {
        html: null as string | null,
        errors: [] as HighlightError[],
      };
      stableHighlightDataRef.current = result;
      return result;
    }

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    // Deep clone errors array to prevent mutations
    const clonedErrors = grammarErrors.map(error => ({
      ...error,
      offset: error.offset,
      errorLength: error.errorLength,
    }));

    // Validate errors and ensure offsets match the actual text
    const validErrors = clonedErrors
      .filter((error): error is HighlightError => {
        // Basic type and bounds validation
        if (
          typeof error.offset !== "number" ||
          typeof error.errorLength !== "number" ||
          error.errorLength <= 0 ||
          error.offset < 0 ||
          error.offset >= currentText.length
        ) {
          return false;
        }

        // Ensure the error doesn't extend beyond text length
        if (error.offset + error.errorLength > currentText.length) {
          return false;
        }

        // Verify the text at the offset is not just whitespace
        const textAtOffset = currentText.slice(
          error.offset,
          error.offset + error.errorLength
        );
        if (!textAtOffset.trim()) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a.offset - b.offset);

    if (validErrors.length === 0) {
      return { html: null, errors: [] };
    }

    let html = "";
    let cursor = 0;

    validErrors.forEach((error, index) => {
      const start = Math.max(error.offset, cursor);
      const end = Math.min(
        error.offset + error.errorLength,
        currentText.length
      );

      // Skip if start is beyond cursor (overlapping errors handled)
      if (start < cursor) {
        return;
      }

      if (start > cursor) {
        html += escapeHtml(currentText.slice(cursor, start));
      }

      const snippet = escapeHtml(currentText.slice(start, end));
      
      // Skip if snippet is empty or only whitespace
      if (!snippet || !snippet.trim()) {
        cursor = Math.max(cursor, end);
        return;
      }

      const title = escapeHtml(error.message || "Grammar issue");
      const errorType = error.type || "grammar";
      const color = getHighlightColor(errorType);
      html += `<mark data-error-index="${index}" style="background: ${color.bg}; color: ${color.text}; padding: 0 2px; border-radius: 6px; cursor: pointer; transition: all 0.2s;" title="${title}" class="error-highlight hover:opacity-80">`;
      html += snippet;
      html += "</mark>";
      cursor = end;
    });

    if (cursor < currentText.length) {
      html += escapeHtml(currentText.slice(cursor));
    }

    const result = { html, errors: validErrors };
    // Cache the result
    stableHighlightDataRef.current = result;
    return result;
    // Only recalculate when analysisKey changes (i.e., when new analysis is loaded)
  }, [analysisKey]);

  // Group grammar errors by category/type and deduplicate by message
  const groupedGrammarErrors = useMemo(() => {
    if (!analysis?.detailed_analysis?.grammar?.errors) return {};

    const grouped: Record<
      string,
      Array<{
        message: string;
        count: number;
        errors: typeof analysis.detailed_analysis.grammar.errors;
      }>
    > = {};

    analysis.detailed_analysis.grammar.errors.forEach((error) => {
      const category = error.type || "grammar";
      if (!grouped[category]) {
        grouped[category] = [];
      }

      // Find if this message already exists
      const existing = grouped[category].find(
        (item) => item.message.toLowerCase() === error.message.toLowerCase()
      );

      if (existing) {
        existing.count++;
        existing.errors.push(error);
      } else {
        grouped[category].push({
          message: error.message,
          count: 1,
          errors: [error],
        });
      }
    });

    return grouped;
  }, [analysis]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <KnowledgeGraphLoader size="md" className="mb-6" />
          <p className="text-lg font-medium text-white mb-2 drop-shadow-lg">
            Analyzing your essay...
          </p>
          <p className="text-sm text-neutral-200 drop-shadow-md">
            Building knowledge graph connections...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/", { state: { text: originalText } })}
            className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Home</span>
          </button>
          <Modal
            isOpen={true}
            onClose={() => navigate("/", { state: { text: originalText } })}
            size="md"
          >
            <div className="flex flex-col items-center text-center p-8">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                Analysis Error
              </h3>
              <p className="text-neutral-600">{error}</p>
              <button
                onClick={() => navigate("/", { state: { text: originalText } })}
                className="mt-6 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Close
              </button>
            </div>
          </Modal>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const scores = analysis.scores || {
    grammar: 0,
    readability: 0,
    coherence: 0,
    argument_strength: 0,
    knowledge_graph: 0,
    overall: 0,
  };

  const recommendations: DiagnosticRecommendation[] =
    analysis.recommendations || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with Back Button and Export */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate("/", { state: { text: originalText } })}
              className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Home</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors shadow-md"
            >
              <Download className="w-5 h-5" />
              <span className="font-medium">Export to PDF</span>
            </button>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                Analysis Results
              </h1>
              <div className="flex flex-wrap gap-3 text-sm text-neutral-600">
                {analysis.word_count && (
                  <span>Word Count: {analysis.word_count}</span>
                )}
                <span>
                  Analyzed: {new Date(analysis.generated_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 mb-6 -mx-6 px-6">
          <div className="flex space-x-4">
            {[
              { id: "analysis", label: "Analysis", icon: TrendingUp },
              { id: "essay", label: "Essay", icon: BookOpen },
              {
                id: "recommendations",
                label: "Recommendation",
                icon: Lightbulb,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(
                      tab.id as "analysis" | "essay" | "recommendations"
                    )
                  }
                  className={`flex items-center space-x-2 px-4 py-3 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-b-2 border-primary text-primary"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Analysis Tab */}
          {activeTab === "analysis" && analysis.detailed_analysis && (
            <div className="space-y-6">
              {/* 1. Argument Knowledge Graph (Toulmin's Model) */}
              {analysis.detailed_analysis.argumentation && (
                <Card>
                  <h4 className="text-lg font-semibold text-neutral-900 mb-4">
                    Argument Structure (Toulmin's Model)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-success-50 rounded-rd">
                      <p className="text-sm text-neutral-600">Claims</p>
                      <p className="text-2xl font-bold text-primary">
                        {
                          analysis.detailed_analysis.argumentation
                            .argument_structure.total_claims
                        }
                      </p>
                    </div>
                    <div className="text-center p-3 bg-success-50 rounded-rd">
                      <p className="text-sm text-neutral-600">Evidence</p>
                      <p className="text-2xl font-bold text-success-default">
                        {
                          analysis.detailed_analysis.argumentation
                            .argument_structure.total_grounds
                        }
                      </p>
                    </div>
                    <div className="text-center p-3 bg-info-50 rounded-rd">
                      <p className="text-sm text-neutral-600">Warrants</p>
                      <p className="text-2xl font-bold text-info-default">
                        {
                          analysis.detailed_analysis.argumentation
                            .argument_structure.total_warrants
                        }
                      </p>
                    </div>
                    <div className="text-center p-3 bg-warning-50 rounded-rd">
                      <p className="text-sm text-neutral-600">Rebuttals</p>
                      <p className="text-2xl font-bold text-warning-default">
                        {
                          analysis.detailed_analysis.argumentation
                            .argument_structure.total_rebuttals
                        }
                      </p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <ArgumentKnowledgeGraph
                      graph={analysis.detailed_analysis.argumentation.graph}
                      metrics={analysis.detailed_analysis.argumentation.metrics}
                    />
                  </div>
                </Card>
              )}

              {/* 2. Knowledge Graph Analysis */}
              {analysis.detailed_analysis.knowledge_graph && (
                <Card>
                  <h4 className="text-lg font-semibold text-neutral-900 mb-4">
                    Knowledge Graph Analysis
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-neutral-600">
                        Concepts Identified
                      </p>
                      <p className="text-lg font-semibold">
                        {
                          analysis.detailed_analysis.knowledge_graph.concepts
                            .length
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">Relationships</p>
                      <p className="text-lg font-semibold">
                        {
                          analysis.detailed_analysis.knowledge_graph
                            .relationships.length
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">Connectivity</p>
                      <p className="text-lg font-semibold">
                        {analysis.detailed_analysis.knowledge_graph.connectivity_score.toFixed(
                          1
                        )}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">Graph Density</p>
                      <p className="text-lg font-semibold">
                        {analysis.detailed_analysis.knowledge_graph.graph_structure.density.toFixed(
                          2
                        )}
                      </p>
                    </div>
                  </div>
                  {analysis.detailed_analysis.knowledge_graph.concepts.length >
                    0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-neutral-700 mb-2">
                        Key Concepts:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.detailed_analysis.knowledge_graph.concepts
                          .slice(0, 10)
                          .map((concept, idx) => (
                            <Badge key={idx} variant="neutral" size="sm">
                              {concept.text} ({concept.frequency})
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* 3. Grammar Analysis - grouped by category */}
              {analysis.detailed_analysis.grammar && (
                <Card>
                  <h4 className="text-lg font-semibold text-neutral-900 mb-4">
                    Grammar Analysis
                  </h4>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600">Score</span>
                      <span className="font-semibold">
                        {analysis.detailed_analysis.grammar.score.toFixed(1)}
                        /100
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600">
                        Error Count
                      </span>
                      <Badge
                        variant={
                          analysis.detailed_analysis.grammar.error_count > 10
                            ? "error"
                            : "warning"
                        }
                      >
                        {analysis.detailed_analysis.grammar.error_count} errors
                      </Badge>
                    </div>
                  </div>

                  {Object.keys(groupedGrammarErrors).length > 0 && (
                    <div className="mt-4 space-y-4">
                      {Object.entries(groupedGrammarErrors).map(
                        ([category, errorGroups]) => {
                          const categoryColor = getCategoryColor(category);
                          const totalCount = errorGroups.reduce(
                            (sum, g) => sum + g.count,
                            0
                          );
                          return (
                            <div key={category}>
                              <h5 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center">
                                <span
                                  className={`${categoryColor.bg} ${categoryColor.text} px-2 py-0.5 text-xs font-medium rounded-full mr-2`}
                                >
                                  {category}
                                </span>
                                <span className="text-xs text-neutral-500">
                                  ({totalCount}{" "}
                                  {totalCount === 1 ? "issue" : "issues"})
                                </span>
                              </h5>
                              <ul className="list-disc list-inside space-y-1 ml-2">
                                {errorGroups.map((errorGroup, idx) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-neutral-700"
                                  >
                                    {errorGroup.message}
                                    {errorGroup.count > 1 && (
                                      <span className="ml-1 text-neutral-500 font-medium">
                                        ({errorGroup.count})
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </Card>
              )}

              {/* 4. Readability Analysis */}
              {analysis.detailed_analysis.readability && (
                <Card>
                  <h4 className="text-lg font-semibold text-neutral-900 mb-4">
                    Readability Analysis
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-neutral-600">
                        Flesch Reading Ease
                      </p>
                      <p className="text-lg font-semibold">
                        {analysis.detailed_analysis.readability.flesch_reading_ease.toFixed(
                          1
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">Grade Level</p>
                      <p className="text-lg font-semibold">
                        {analysis.detailed_analysis.readability.flesch_kincaid_grade.toFixed(
                          1
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">
                        Lexical Diversity
                      </p>
                      <p className="text-lg font-semibold">
                        {(
                          analysis.detailed_analysis.readability
                            .lexical_diversity * 100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">SMOG Index</p>
                      <p className="text-lg font-semibold">
                        {analysis.detailed_analysis.readability.smog_index.toFixed(
                          1
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* 5. Overall Score - The 5 score cards */}
              <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                  {[
                    {
                      key: "grammar",
                      label: "Grammar",
                      icon: BookOpen,
                      color: "primary",
                    },
                    {
                      key: "readability",
                      label: "Readability",
                      icon: TrendingUp,
                      color: "success",
                    },
                    {
                      key: "coherence",
                      label: "Coherence",
                      icon: Brain,
                      color: "info",
                    },
                    {
                      key: "argument_strength",
                      label: "Argument",
                      icon: Target,
                      color: "warning",
                    },
                    {
                      key: "knowledge_graph",
                      label: "Knowledge Graph",
                      icon: Brain,
                      color: "secondary",
                    },
                  ].map(({ key, label, icon: Icon, color }) => {
                    const score = scores[key as keyof typeof scores] || 0;
                    return (
                      <Card key={key}>
                        <div className="text-center flex flex-col h-full">
                          <Icon
                            className={`w-8 h-8 text-${color} mx-auto mb-1`}
                          />
                          <h5 className="font-semibold text-neutral-900 mb-4">
                            {label}
                          </h5>
                          <div className="mt-auto">
                            <div
                              className={`text-xl font-bold text-${color} mb-1`}
                            >
                              {Math.round(score)}
                            </div>
                            <ProgressBar
                              value={score}
                              color={getScoreColor(score)}
                              size="sm"
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </Card>

              {/* 6. Thesis Statement Summary Card */}
              {analysis.detailed_analysis.argumentation?.thesis_statement && (
                <Card className="border-l-4 border-l-info">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <Target className="w-5 h-5 text-info-default" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="info" size="sm">
                          THESIS
                        </Badge>
                        <Badge variant="neutral" size="sm">
                          argumentation
                        </Badge>
                      </div>
                      <h5 className="font-semibold text-neutral-900 mb-2">
                        {(() => {
                          const claimsCount =
                            analysis.detailed_analysis.argumentation
                              .argument_structure?.total_claims || 0;
                          const evidenceCount =
                            analysis.detailed_analysis.argumentation
                              .argument_structure?.total_grounds || 0;

                          // Generate summary title
                          if (claimsCount > 0 || evidenceCount > 0) {
                            return `Thesis statement identified (${claimsCount} claims, ${evidenceCount} evidence pieces)`;
                          }
                          return "Thesis statement identified";
                        })()}
                      </h5>
                      <div className="mb-3 p-2 bg-neutral-50 rounded-rd border border-neutral-200">
                        <p className="text-sm text-neutral-700 italic">
                          "
                          {
                            analysis.detailed_analysis.argumentation
                              .thesis_statement.sentence
                          }
                          "
                        </p>
                      </div>
                      <p className="text-sm text-neutral-600 mb-2">
                        {(() => {
                          const thesis =
                            analysis.detailed_analysis.argumentation
                              .thesis_statement;
                          const confidence =
                            thesis.confidence?.toLowerCase() || "";
                          const claimsCount =
                            analysis.detailed_analysis.argumentation
                              .argument_structure?.total_claims || 0;
                          const evidenceCount =
                            analysis.detailed_analysis.argumentation
                              .argument_structure?.total_grounds || 0;
                          const argumentScore =
                            analysis.scores?.argument_strength || 0;

                          // Generate brief explanation based on analysis
                          let explanation = "";

                          if (confidence.includes("high")) {
                            explanation +=
                              "The thesis statement is clearly identifiable and ";
                          } else if (confidence.includes("medium")) {
                            explanation +=
                              "A thesis statement has been identified, though ";
                          } else {
                            explanation +=
                              "A potential thesis statement was found, ";
                          }

                          if (claimsCount > 3 && evidenceCount > 3) {
                            explanation +=
                              "is well-supported with multiple claims and evidence. ";
                          } else if (claimsCount > 0 || evidenceCount > 0) {
                            explanation +=
                              "has some supporting claims and evidence. ";
                          } else {
                            explanation +=
                              "may need more supporting elements. ";
                          }

                          if (argumentScore >= 80) {
                            explanation +=
                              "The argument structure is strong and well-developed.";
                          } else if (argumentScore >= 60) {
                            explanation +=
                              "Consider strengthening the argument structure and supporting evidence.";
                          } else {
                            explanation +=
                              "The argument structure could benefit from additional development and support.";
                          }

                          return (
                            explanation ||
                            "Review the thesis statement's clarity and supporting elements."
                          );
                        })()}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Essay Tab */}
          {activeTab === "essay" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left side - Essay text */}
              <div className="lg:col-span-2">
                <Card>
                  {highlightData.html ? (
                    <div className="space-y-3">
                      <div className="text-md text-neutral-600">
                        Click on highlighted text to see suggestions. (
                        {highlightData.errors.length} issues)
                      </div>
                      <div
                        className="whitespace-pre-wrap leading-relaxed text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-rd p-4"
                        dangerouslySetInnerHTML={{ __html: highlightData.html }}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.classList.contains("error-highlight")) {
                            const errorIndex = parseInt(
                              target.getAttribute("data-error-index") || "0"
                            );
                            if (
                              errorIndex >= 0 &&
                              errorIndex < highlightData.errors.length
                            ) {
                              setSelectedError(
                                highlightData.errors[errorIndex]
                              );
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-neutral-600">
                      No grammar highlights available. Run an analysis to view
                      issues mapped to your essay text.
                    </p>
                  )}
                </Card>
              </div>

              {/* Right side - Error details and legend */}
              <div className="lg:col-span-1">
                <Card className="sticky top-6">
                  <div className="space-y-6">
                    {/* Color Legend */}
                    <div>
                      <h4 className="text-lg font-semibold text-neutral-900 mb-3">
                        Error Types
                      </h4>
                      <div className="space-y-2">
                        {[
                          {
                            type: "grammar",
                            label: "Grammar",
                            color: "rgba(239, 68, 68, 0.35)",
                            textColor: "#991b1b",
                          },
                          {
                            type: "capitalization",
                            label: "Capitalization",
                            color: "rgba(59, 130, 246, 0.35)",
                            textColor: "#1e40af",
                          },
                          {
                            type: "word_choice",
                            label: "Word Choice",
                            color: "rgba(168, 85, 247, 0.35)",
                            textColor: "#6b21a8",
                          },
                          {
                            type: "spelling",
                            label: "Spelling",
                            color: "rgba(249, 115, 22, 0.35)",
                            textColor: "#9a3412",
                          },
                          {
                            type: "punctuation",
                            label: "Punctuation",
                            color: "rgba(234, 179, 8, 0.35)",
                            textColor: "#854d0e",
                          },
                        ].map((item) => (
                          <div
                            key={item.type}
                            className="flex items-center space-x-2"
                          >
                            <div
                              className="w-4 h-4 rounded"
                              style={{
                                backgroundColor: item.color,
                                border: `1px solid ${item.textColor}`,
                              }}
                            />
                            <span className="text-sm text-neutral-700">
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Selected Error Details */}
                    {selectedError ? (
                      <div className="border-t border-neutral-200 pt-4">
                        <h4 className="text-lg font-semibold text-neutral-900 mb-3">
                          Error Details
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <Badge
                              variant={
                                selectedError.type === "grammar"
                                  ? "error"
                                  : selectedError.type === "spelling"
                                  ? "warning"
                                  : "info"
                              }
                              size="sm"
                            >
                              {selectedError.type || "grammar"}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-700 mb-1">
                              Issue:
                            </p>
                            <p className="text-sm text-neutral-600">
                              {selectedError.message || "Grammar issue"}
                            </p>
                          </div>
                          {selectedError.suggestion && (
                            <div>
                              <p className="text-sm font-medium text-neutral-700 mb-1">
                                Suggestion:
                              </p>
                              <p className="text-sm text-neutral-600">
                                {selectedError.suggestion}
                              </p>
                            </div>
                          )}
                          {selectedError.context && (
                            <div>
                              <p className="text-sm font-medium text-neutral-700 mb-1">
                                Context:
                              </p>
                              <p className="text-sm text-neutral-500 italic">
                                "{selectedError.context}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-neutral-200 pt-4">
                        <p className="text-sm text-neutral-500 italic">
                          Click on a highlighted error to see details and
                          suggestions.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === "recommendations" && (
            <div className="space-y-4 mt-4">
              {recommendations.length > 0 ? (
                recommendations.map((recommendation, index) => {
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card
                        className={`border-l-4 ${
                          recommendation.priority === "high"
                            ? "border-l-error"
                            : recommendation.priority === "medium"
                            ? "border-l-warning"
                            : "border-l-info"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getPriorityIcon(recommendation.priority)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge
                                variant={
                                  getPriorityColor(recommendation.priority) as
                                    | "error"
                                    | "warning"
                                    | "info"
                                    | "neutral"
                                }
                                size="sm"
                              >
                                {recommendation.priority.toUpperCase()}
                              </Badge>
                              <Badge variant="neutral" size="sm">
                                {recommendation.dimension}
                              </Badge>
                            </div>
                            <h5 className="font-semibold text-neutral-900 mb-1">
                              {recommendation.message}
                            </h5>
                            {recommendation.suggestion && (
                              <p className="text-sm text-neutral-600 mb-2">
                                {recommendation.suggestion}
                              </p>
                            )}
                            {recommendation.action_items &&
                              recommendation.action_items.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-neutral-200">
                                  <p className="text-sm font-medium text-neutral-700 mb-2 flex items-center">
                                    <Target className="w-4 h-4 mr-1" />
                                    Action Items:
                                  </p>
                                  <ul className="space-y-1">
                                    {recommendation.action_items.map(
                                      (item, itemIdx) => (
                                        <li
                                          key={itemIdx}
                                          className="flex items-start text-sm text-neutral-600"
                                        >
                                          <ArrowRight className="w-4 h-4 mr-2 mt-0.5 text-primary flex-shrink-0" />
                                          <span>{item}</span>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })
              ) : (
                <Card className="text-center py-8">
                  <Award className="w-12 h-12 text-success-default mx-auto mb-3" />
                  <p className="text-neutral-600">
                    No specific recommendations. Overall writing quality is
                    good!
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;
