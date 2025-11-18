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
  Loader2,
  X,
} from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import ProgressBar from "../ui/ProgressBar";
import Modal from "../ui/Modal";
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
    "overview" | "detailed" | "recommendations" | "highlights"
  >("overview");

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
      html += `<mark style="background: rgba(248, 113, 113, 0.35); color: #991b1b; padding: 0 2px; border-radius: 4px;" title="${title}">`;
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
      >
        <Loader2 className='w-12 h-12 text-primary animate-spin mb-4' />
        <p className='text-lg font-medium text-neutral-700 mb-2'>
          Analyzing your essay...
        </p>
        <p className='text-sm text-neutral-500'>
          This may take a moment, Please wait.
        </p>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose || (() => {})}
        size='xl'
        className='max-h-[90vh]'
      >
        <Card className='bg-error-50 border border-error-200'>
          <div className='flex items-start justify-between'>
            <div className='flex items-start space-x-3 flex-1'>
              <AlertTriangle className='w-6 h-6 text-error-default flex-shrink-0 mt-0.5' />
              <div className='flex-1'>
                <h4 className='text-lg font-semibold text-error-dark mb-1'>
                  Analysis Failed
                </h4>
                <p className='text-error-dark'>{error}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className='mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors'
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>
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

  const diagnosticSummary = analysis.diagnostic_summary;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      size='xl'
      className='max-h-[90vh]'
      contentClassName='flex-1 overflow-y-auto pr-4 min-h-0 relative'
    >
      {onClose && (
        <button
          onClick={onClose}
          className='sticky top-0 z-20 float-right ml-auto p-2 rounded-lg shadow-md bg-white hover:bg-primary/10 transition-colors duration-200 w-fit flex-shrink-0'
          aria-label='Close modal'
        >
          <X className='w-5 h-5 text-neutral-500' />
        </button>
      )}
      <div className='flex items-start justify-between mb-5 clear-right'>
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
      </div>

      {/* Diagnostic Summary */}
      {diagnosticSummary && (
        <Card className='bg-gradient-to-r from-primary-50 to-secondary-50 mb-5'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div>
              <p className='text-sm text-neutral-600 mb-1'>Overall Score</p>
              <p className='text-3xl font-bold text-white'>
                {diagnosticSummary.overall_score.toFixed(1)}
              </p>
            </div>
            {diagnosticSummary.strengths.length > 0 && (
              <div>
                <p className='text-sm text-neutral-600 mb-1'>Strengths</p>
                <div className='flex flex-wrap gap-1'>
                  {diagnosticSummary.strengths.slice(0, 3).map((s) => (
                    <Badge key={s} variant='success' size='sm'>
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {diagnosticSummary.weaknesses.length > 0 && (
              <div>
                <p className='text-sm text-neutral-600 mb-1'>
                  Areas to Improve
                </p>
                <div className='flex flex-wrap gap-1'>
                  {diagnosticSummary.weaknesses.slice(0, 3).map((w) => (
                    <Badge key={w} variant='warning' size='sm'>
                      {w}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className='border-b border-neutral-200 mb-5'>
        <div className='flex space-x-4'>
          {[
            { id: "overview", label: "Overview", icon: TrendingUp },
            { id: "detailed", label: "Detailed Analysis", icon: BookOpen },
            { id: "highlights", label: "Highlights", icon: AlertTriangle },
            {
              id: "recommendations",
              label: "Recommendations",
              icon: Lightbulb,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id as
                      | "overview"
                      | "detailed"
                      | "recommendations"
                      | "highlights"
                  )
                }
                className={`flex items-center space-x-2 px-4 py-2 font-medium text-sm transition-colors ${
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

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className='space-y-6'>
          <Card>
            <div className='flex items-center space-x-3 mb-4 justify-between'>
              <div className='flex items-center space-x-3'>
                {scores.overall >= 80 ? (
                  <CheckCircle className='w-6 h-6 text-success-default' />
                ) : scores.overall >= 60 ? (
                  <AlertCircle className='w-6 h-6 text-warning-default' />
                ) : (
                  <AlertTriangle className='w-6 h-6 text-error-default' />
                )}
                <h4 className='text-xl font-bold text-neutral-900'>
                  Overall Score
                </h4>
              </div>
              <div className='text-4xl font-bold text-primary'>
                {scores.overall.toFixed(1)}
              </div>
            </div>
            <ProgressBar
              value={scores.overall}
              color={getScoreColor(scores.overall)}
            />
          </Card>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
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
                  <div className='text-center'>
                    <Icon className={`w-8 h-8 text-${color} mx-auto mb-2`} />
                    <h5 className='font-semibold text-neutral-900 mb-1'>
                      {label}
                    </h5>
                    <div className={`text-2xl font-bold text-${color} mb-2`}>
                      {Math.round(score)}
                    </div>
                    <ProgressBar
                      value={score}
                      color={getScoreColor(score)}
                      size='sm'
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Analysis Tab */}
      {activeTab === "detailed" && analysis.detailed_analysis && (
        <div className='space-y-6 mt-4'>
          {/* Grammar Analysis */}
          {analysis.detailed_analysis.grammar && (
            <Card>
              <h4 className='text-lg font-semibold text-neutral-900 mb-4'>
                Grammar Analysis
              </h4>
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-neutral-600'>Score</span>
                  <span className='font-semibold'>
                    {analysis.detailed_analysis.grammar.score.toFixed(1)}/100
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-neutral-600'>Error Count</span>
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
                {analysis.detailed_analysis.grammar.errors.length > 0 && (
                  <div className='mt-4 space-y-2'>
                    <p className='text-sm font-medium text-neutral-700'>
                      Top Issues:
                    </p>
                    {analysis.detailed_analysis.grammar.errors
                      .slice(0, 5)
                      .map((error, idx) => (
                        <div
                          key={idx}
                          className='bg-error-50 border border-error-200 rounded p-2'
                        >
                          <Badge variant='error' size='sm' className='mb-1'>
                            {error.type}
                          </Badge>
                          <p className='text-sm text-neutral-700'>
                            {error.message}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Readability Analysis */}
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
                  <p className='text-sm text-neutral-600'>Lexical Diversity</p>
                  <p className='text-lg font-semibold'>
                    {(
                      analysis.detailed_analysis.readability.lexical_diversity *
                      100
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

          {/* Argument Analysis */}
          {analysis.detailed_analysis.argumentation && (
            <Card>
              <h4 className='text-lg font-semibold text-neutral-900 mb-4'>
                Argument Structure (Toulmin's Model)
              </h4>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
                <div className='text-center p-3 bg-primary-50 rounded-lg'>
                  <p className='text-sm text-neutral-600'>Claims</p>
                  <p className='text-2xl font-bold text-primary'>
                    {
                      analysis.detailed_analysis.argumentation
                        .argument_structure.total_claims
                    }
                  </p>
                </div>
                <div className='text-center p-3 bg-success-50 rounded-lg'>
                  <p className='text-sm text-neutral-600'>Evidence</p>
                  <p className='text-2xl font-bold text-success-default'>
                    {
                      analysis.detailed_analysis.argumentation
                        .argument_structure.total_grounds
                    }
                  </p>
                </div>
                <div className='text-center p-3 bg-info-50 rounded-lg'>
                  <p className='text-sm text-neutral-600'>Warrants</p>
                  <p className='text-2xl font-bold text-info-default'>
                    {
                      analysis.detailed_analysis.argumentation
                        .argument_structure.total_warrants
                    }
                  </p>
                </div>
                <div className='text-center p-3 bg-warning-50 rounded-lg'>
                  <p className='text-sm text-neutral-600'>Rebuttals</p>
                  <p className='text-2xl font-bold text-warning-default'>
                    {
                      analysis.detailed_analysis.argumentation
                        .argument_structure.total_rebuttals
                    }
                  </p>
                </div>
              </div>
              {analysis.detailed_analysis.argumentation.thesis_statement && (
                <div className='mt-4 p-3 bg-primary-50 rounded-lg'>
                  <p className='text-sm font-medium text-neutral-700 mb-1'>
                    Thesis Statement:
                  </p>
                  <p className='text-sm text-neutral-600 italic'>
                    "
                    {
                      analysis.detailed_analysis.argumentation.thesis_statement
                        .sentence
                    }
                    "
                  </p>
                </div>
              )}
              <div className='mt-6'>
                <ArgumentKnowledgeGraph
                  graph={analysis.detailed_analysis.argumentation.graph}
                  metrics={analysis.detailed_analysis.argumentation.metrics}
                />
              </div>
            </Card>
          )}

          {/* Knowledge Graph */}
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
                    {analysis.detailed_analysis.knowledge_graph.concepts.length}
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
        </div>
      )}

      {/* Highlights Tab */}
      {activeTab === "highlights" && (
        <div className='space-y-4 mt-4'>
          <Card>
            <h4 className='text-lg font-semibold text-neutral-900 mb-3'>
              Highlighted Essay
            </h4>
            {highlightData.html ? (
              <div className='space-y-3'>
                <div className='text-sm text-neutral-600'>
                  Hover over highlighted text to see issue details. (
                  {highlightData.errors.length} issues)
                </div>
                <div
                  className='whitespace-pre-wrap leading-relaxed text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-lg p-4'
                  dangerouslySetInnerHTML={{ __html: highlightData.html }}
                />
              </div>
            ) : (
              <p className='text-neutral-600'>
                No grammar highlights available. Run an analysis to view issues
                mapped to your essay text.
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
    </Modal>
  );
};

export default InlineAnalysisResults;
