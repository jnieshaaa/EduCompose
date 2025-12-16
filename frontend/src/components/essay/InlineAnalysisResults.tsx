import React, { useMemo, useState } from "react";
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
  X,
} from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import ProgressBar from "../ui/ProgressBar";
import Modal from "../ui/Modal";
import KnowledgeGraphLoader from "../ui/KnowledgeGraphLoader";
import ArgumentKnowledgeGraph from "./ArgumentKnowledgeGraph";
import type {
  AnalysisResponse,
  DiagnosticRecommendation,
  GrammarError,
} from "../../types/Essay";

interface InlineAnalysisResultsProps {
  analysis: Omit<AnalysisResponse, "essay_id"> | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onClose?: () => void;
  originalText?: string;
  isOpen?: boolean;
}

type HighlightError = GrammarError & {
  offset: number;
  errorLength: number;
};

const InlineAnalysisResults: React.FC<InlineAnalysisResultsProps> = ({
  analysis,
  loading,
  error,
  onRetry,
  onClose,
  originalText,
  isOpen: externalIsOpen,
}) => {
  const [activeTab, setActiveTab] = useState<
    "analysis" | "essay" | "recommendations"
  >("analysis");

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
        return <AlertTriangle className='w-4 h-4' />;
      case "medium":
        return <AlertCircle className='w-4 h-4' />;
      case "low":
        return <CheckCircle className='w-4 h-4' />;
      default:
        return <Lightbulb className='w-4 h-4' />;
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
        structure: {
          bg: "bg-green-50",
          text: "text-green-700",
          border: "border-green-200",
        },
      };
    return colors[category.toLowerCase()] || colors.grammar;
  };

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
      structure: {
        bg: "rgba(34, 197, 94, 0.35)", // green
        text: "#166534",
      },
    };
    return colors[category.toLowerCase()] || colors.grammar;
  };

  const highlightData = useMemo(() => {
    const grammarErrors = analysis?.detailed_analysis?.grammar?.errors ?? [];

    if (!analysis || !originalText || grammarErrors.length === 0) {
      return {
        html: null as string | null,
        errors: [] as HighlightError[],
      };
    }

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const validErrors = [...grammarErrors]
      .filter(
        (error): error is HighlightError =>
          typeof error.offset === "number" &&
          typeof error.errorLength === "number" &&
          error.errorLength > 0 &&
          error.offset < originalText.length
      )
      .sort((a, b) => a.offset - b.offset);

    if (validErrors.length === 0) {
      return { html: null, errors: [] };
    }

    let html = "";
    let cursor = 0;

    validErrors.forEach((error) => {
      const start = Math.max(error.offset, cursor);
      const end = Math.min(
        error.offset + error.errorLength,
        originalText.length
      );

      if (start > cursor) {
        html += escapeHtml(originalText.slice(cursor, start));
      }

      const snippet = escapeHtml(originalText.slice(start, end));
      const title = escapeHtml(error.message || "Grammar issue");
      const errorType = error.type || "grammar";
      const color = getHighlightColor(errorType);
      html += `<mark style="background: ${color.bg}; color: ${color.text}; padding: 0 2px; border-radius: 6px;" title="${title}">`;
      html += snippet || "\u200B";
      html += "</mark>";
      cursor = end;
    });

    if (cursor < originalText.length) {
      html += escapeHtml(originalText.slice(cursor));
    }

    return { html, errors: validErrors };
  }, [analysis, originalText]);

  // Use external isOpen prop if provided, otherwise calculate based on state
  const isOpen =
    externalIsOpen !== undefined
      ? externalIsOpen
      : loading || !!analysis || !!error;

  if (loading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose || (() => {})}
        size='xl'
        className='max-h-[90vh]'
        contentClassName='flex flex-col items-center justify-center py-12'
        transparent={true}
        closeOnBackdropClick={false}
      >
        <KnowledgeGraphLoader size='md' className='mb-6' />
        <p className='text-lg font-medium text-white mb-2 drop-shadow-lg'>
          Analyzing your essay...
        </p>
        <p className='text-sm text-neutral-200 drop-shadow-md'>
          Building knowledge graph connections...
        </p>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose || (() => {})}
        size='md'
        className='max-h-[90vh]'
      >
        <div className='flex flex-col items-center text-center p-8'>
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className='w-6 h-6 text-red-600' />
          </div>
          <h4 className='text-xl font-semibold text-neutral-900 mb-3'>
            Analysis Error
          </h4>
          <p className='text-neutral-600'>{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className='mt-6 px-4 py-2 bg-primary text-white rounded-rd hover:bg-primary-600 transition-colors'
            >
              Try Again
            </button>
          )}
        </div>
      </Modal>
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
    <Modal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      size='xl'
      className='max-h-[90vh]'
      contentClassName='flex flex-col pr-5 min-h-0 relative'
    >
      {/* Header */}
      <div className='flex items-start justify-between mb-5 flex-shrink-0'>
        <div className='flex-1'>
          <h2 className='text-2xl font-bold text-neutral-900 mb-2'>
            Analysis Results
          </h2>
          <div className='flex flex-wrap gap-3 text-sm text-neutral-600'>
            {analysis.word_count && (
              <span>Word Count: {analysis.word_count}</span>
            )}
            <span>
              Analyzed: {new Date(analysis.generated_at).toLocaleString()}
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className='p-2 rounded-rs shadow-md bg-white hover:bg-primary/10 transition-colors duration-200 w-fit flex-shrink-0'
            aria-label='Close modal'
          >
            <X className='w-5 h-5 text-neutral-500' />
          </button>
        )}
      </div>

      {/* Sticky Tabs */}
      <div className='sticky top-0 z-10 bg-white border-b border-neutral-200 mb-6 -mx-5 px-5 flex-shrink-0'>
        <div className='flex space-x-4'>
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
                <Icon className='w-4 h-4' />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content - Scrollable */}
      <div className='flex-1 overflow-y-auto'>
        {/* Analysis Tab */}
        {activeTab === "analysis" && analysis.detailed_analysis && (
          <div className='space-y-6'>
            {/* 1. Argument Knowledge Graph (Toulmin's Model) */}
            {analysis.detailed_analysis.argumentation && (
              <Card>
                <h4 className='text-lg font-semibold text-neutral-900 mb-4'>
                  Argument Structure (Toulmin's Model)
                </h4>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
                  <div className='text-center p-3 bg-success-50 rounded-rd'>
                    <p className='text-sm text-neutral-600'>Claims</p>
                    <p className='text-2xl font-bold text-primary'>
                      {
                        analysis.detailed_analysis.argumentation
                          .argument_structure.total_claims
                      }
                    </p>
                  </div>
                  <div className='text-center p-3 bg-success-50 rounded-rd'>
                    <p className='text-sm text-neutral-600'>Evidence</p>
                    <p className='text-2xl font-bold text-success-default'>
                      {
                        analysis.detailed_analysis.argumentation
                          .argument_structure.total_grounds
                      }
                    </p>
                  </div>
                  <div className='text-center p-3 bg-info-50 rounded-rd'>
                    <p className='text-sm text-neutral-600'>Warrants</p>
                    <p className='text-2xl font-bold text-info-default'>
                      {
                        analysis.detailed_analysis.argumentation
                          .argument_structure.total_warrants
                      }
                    </p>
                  </div>
                  <div className='text-center p-3 bg-warning-50 rounded-rd'>
                    <p className='text-sm text-neutral-600'>Rebuttals</p>
                    <p className='text-2xl font-bold text-warning-default'>
                      {
                        analysis.detailed_analysis.argumentation
                          .argument_structure.total_rebuttals
                      }
                    </p>
                  </div>
                </div>

                {/* Metrics - Coherence and Argument Strength */}
                {/* {analysis.detailed_analysis.argumentation.metrics && (
                  <div className="mb-6 space-y-4">
                    {analysis.detailed_analysis.argumentation.metrics
                      .coherence !== undefined && (
                      <div>
                        <h5 className="text-sm font-semibold text-neutral-800 mb-2">
                          Coherence
                        </h5>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  analysis.detailed_analysis.argumentation
                                    .metrics.coherence ?? 0
                                )
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-neutral-500 mt-1 inline-block">
                          {Math.round(
                            analysis.detailed_analysis.argumentation.metrics
                              .coherence ?? 0
                          )}
                          %
                        </span>
                      </div>
                    )}
                  </div>
                )} */}

                {/* Knowledge Graph */}
                <div className='mt-6'>
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
                <h4 className='text-lg font-semibold text-neutral-900 mb-4'>
                  Knowledge Graph Analysis
                </h4>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
                  <div>
                    <p className='text-sm text-neutral-600'>
                      Concepts Identified
                    </p>
                    <p className='text-lg font-semibold'>
                      {
                        analysis.detailed_analysis.knowledge_graph.concepts
                          .length
                      }
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-neutral-600'>Relationships</p>
                    <p className='text-lg font-semibold'>
                      {
                        analysis.detailed_analysis.knowledge_graph.relationships
                          .length
                      }
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-neutral-600'>Connectivity</p>
                    <p className='text-lg font-semibold'>
                      {analysis.detailed_analysis.knowledge_graph.connectivity_score.toFixed(
                        1
                      )}
                      %
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-neutral-600'>Graph Density</p>
                    <p className='text-lg font-semibold'>
                      {analysis.detailed_analysis.knowledge_graph.graph_structure.density.toFixed(
                        2
                      )}
                    </p>
                  </div>
                </div>
                {analysis.detailed_analysis.knowledge_graph.concepts.length >
                  0 && (
                  <div className='mt-4'>
                    <p className='text-sm font-medium text-neutral-700 mb-2'>
                      Key Concepts:
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {analysis.detailed_analysis.knowledge_graph.concepts
                        .slice(0, 10)
                        .map((concept, idx) => (
                          <Badge key={idx} variant='neutral' size='sm'>
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
                <h4 className='text-lg font-semibold text-neutral-900 mb-4'>
                  Grammar Analysis
                </h4>
                <div className='space-y-3 mb-4'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-neutral-600'>Score</span>
                    <span className='font-semibold'>
                      {analysis.detailed_analysis.grammar.score.toFixed(1)}/100
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-neutral-600'>
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
                  <div className='mt-4 space-y-4'>
                    {Object.entries(groupedGrammarErrors).map(
                      ([category, errorGroups]) => {
                        const categoryColor = getCategoryColor(category);
                        const totalCount = errorGroups.reduce(
                          (sum, g) => sum + g.count,
                          0
                        );
                        return (
                          <div key={category}>
                            <h5 className='text-sm font-semibold text-neutral-700 mb-2 flex items-center'>
                              <span
                                className={`${categoryColor.bg} ${categoryColor.text} px-2 py-0.5 text-xs font-medium rounded-full mr-2`}
                              >
                                {category}
                              </span>
                              <span className='text-xs text-neutral-500'>
                                ({totalCount}{" "}
                                {totalCount === 1 ? "issue" : "issues"})
                              </span>
                            </h5>
                            <ul className='list-disc list-inside space-y-1 ml-2'>
                              {errorGroups.map((errorGroup, idx) => (
                                <li
                                  key={idx}
                                  className='text-sm text-neutral-700'
                                >
                                  {errorGroup.message}
                                  {errorGroup.count > 1 && (
                                    <span className='ml-1 text-neutral-500 font-medium'>
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
                <h4 className='text-lg font-semibold text-neutral-900 mb-4'>
                  Readability Analysis
                </h4>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <div>
                    <p className='text-sm text-neutral-600'>
                      Flesch Reading Ease
                    </p>
                    <p className='text-lg font-semibold'>
                      {analysis.detailed_analysis.readability.flesch_reading_ease.toFixed(
                        1
                      )}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-neutral-600'>Grade Level</p>
                    <p className='text-lg font-semibold'>
                      {analysis.detailed_analysis.readability.flesch_kincaid_grade.toFixed(
                        1
                      )}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-neutral-600'>
                      Lexical Diversity
                    </p>
                    <p className='text-lg font-semibold'>
                      {(
                        analysis.detailed_analysis.readability
                          .lexical_diversity * 100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-neutral-600'>SMOG Index</p>
                    <p className='text-lg font-semibold'>
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
              {/* <div className="flex items-center space-x-6 mb-6">
                <div className="flex items-center space-x-3">
                  {scores.overall >= 80 ? (
                    <CheckCircle className="w-6 h-6 text-success-default" />
                  ) : scores.overall >= 60 ? (
                    <AlertCircle className="w-6 h-6 text-warning-default" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-error-default" />
                  )}
                  <h4 className="text-xl font-semibold text-neutral-900">
                    Overall Score
                  </h4>
                </div>
                <div className="flex-1">
                  <ProgressBar
                    value={scores.overall}
                    color={getScoreColor(scores.overall)}
                  />
                </div>
                <div
                  className={`text-2xl font-bold ${
                    scores.overall >= 80
                      ? "text-success-default"
                      : scores.overall >= 60
                      ? "text-warning-default"
                      : "text-error-default"
                  }`}
                >
                  {scores.overall.toFixed(1)}
                </div>
              </div> */}

              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5'>
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
                      <div className='text-center flex flex-col h-full'>
                        <Icon
                          className={`w-8 h-8 text-${color} mx-auto mb-1`}
                        />
                        <h5 className='font-semibold text-neutral-900 mb-4'>
                          {label}
                        </h5>
                        <div className='mt-auto'>
                          <div
                            className={`text-xl font-bold text-${color} mb-1`}
                          >
                            {Math.round(score)}
                          </div>
                          <ProgressBar
                            value={score}
                            color={getScoreColor(score)}
                            size='sm'
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>

            {/* Thesis Statement Summary Card */}
            {analysis.detailed_analysis.argumentation.thesis_statement && (
              <Card className='border-l-4 border-l-info'>
                <div className='flex items-start space-x-3'>
                  <div className='flex-shrink-0 mt-1'>
                    <Target className='w-5 h-5 text-info-default' />
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center space-x-2 mb-2'>
                      <Badge variant='info' size='sm'>
                        THESIS
                      </Badge>
                      <Badge variant='neutral' size='sm'>
                        argumentation
                      </Badge>
                    </div>
                    <h5 className='font-semibold text-neutral-900 mb-2'>
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
                    <div className='mb-3 p-2 bg-neutral-50 rounded-rd border border-neutral-200'>
                      <p className='text-sm text-neutral-700 italic'>
                        "
                        {
                          analysis.detailed_analysis.argumentation
                            .thesis_statement.sentence
                        }
                        "
                      </p>
                    </div>
                    <p className='text-sm text-neutral-600 mb-2'>
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
                          explanation += "may need more supporting elements. ";
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
          <div className='space-y-6'>
            <Card>
              {highlightData.html ? (
                <div className='space-y-3'>
                  <div className='text-md text-neutral-600'>
                    Hover over highlighted text to see issue details. (
                    {highlightData.errors.length} issues)
                  </div>
                  <div
                    className='whitespace-pre-wrap leading-relaxed text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-rd p-4'
                    dangerouslySetInnerHTML={{ __html: highlightData.html }}
                  />
                </div>
              ) : (
                <p className='text-neutral-600'>
                  No grammar highlights available. Run an analysis to view
                  issues mapped to your essay text.
                </p>
              )}
            </Card>
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === "recommendations" && (
          <div className='space-y-4 mt-4'>
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
                      <div className='flex items-start space-x-3'>
                        <div className='flex-shrink-0 mt-1'>
                          {getPriorityIcon(recommendation.priority)}
                        </div>
                        <div className='flex-1'>
                          <div className='flex items-center space-x-2 mb-2'>
                            <Badge
                              variant={
                                getPriorityColor(recommendation.priority) as
                                  | "error"
                                  | "warning"
                                  | "info"
                                  | "neutral"
                              }
                              size='sm'
                            >
                              {recommendation.priority.toUpperCase()}
                            </Badge>
                            <Badge variant='neutral' size='sm'>
                              {recommendation.dimension}
                            </Badge>
                          </div>
                          <h5 className='font-semibold text-neutral-900 mb-1'>
                            {recommendation.message}
                          </h5>
                          {recommendation.suggestion && (
                            <p className='text-sm text-neutral-600 mb-2'>
                              {recommendation.suggestion}
                            </p>
                          )}
                          {recommendation.action_items &&
                            recommendation.action_items.length > 0 && (
                              <div className='mt-3 pt-3 border-t border-neutral-200'>
                                <p className='text-sm font-medium text-neutral-700 mb-2 flex items-center'>
                                  <Target className='w-4 h-4 mr-1' />
                                  Action Items:
                                </p>
                                <ul className='space-y-1'>
                                  {recommendation.action_items.map(
                                    (item, itemIdx) => (
                                      <li
                                        key={itemIdx}
                                        className='flex items-start text-sm text-neutral-600'
                                      >
                                        <ArrowRight className='w-4 h-4 mr-2 mt-0.5 text-primary flex-shrink-0' />
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
              <Card className='text-center py-8'>
                <Award className='w-12 h-12 text-success-default mx-auto mb-3' />
                <p className='text-neutral-600'>
                  No specific recommendations. Overall writing quality is good!
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default InlineAnalysisResults;
