import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  TrendingUp,
  Brain,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  Network,
  FileText,
  Award,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Layers,
} from "lucide-react";
import Modal from "../ui/Modal";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import ProgressBar from "../ui/ProgressBar";
import ArgumentKnowledgeGraph from "./ArgumentKnowledgeGraph";
import type {
  Essay,
  AnalysisResponse,
  DiagnosticRecommendation,
} from "../../types/Essay";
import { analysisApi } from "../../api";

interface EnhancedEssayAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  essay: Essay;
  onAnalysisComplete?: (analysis: AnalysisResponse) => void;
}

const EnhancedEssayAnalysisModal: React.FC<EnhancedEssayAnalysisModalProps> = ({
  isOpen,
  onClose,
  essay,
  onAnalysisComplete,
}) => {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "detailed" | "recommendations"
  >("overview");

  React.useEffect(() => {
    if (isOpen && essay.status === "analyzed" && !analysis) {
      // Load analysis if essay is already analyzed
      // In a real app, you'd fetch this from the API
    }
  }, [isOpen, essay, analysis]);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analysisApi.analyzeEssay(essay.id, "comprehensive");
      setAnalysis(result);
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (error) {
      console.error("Error analyzing essay:", error);
    } finally {
      setLoading(false);
    }
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

  // Use analysis data if available, otherwise use essay data
  const scores = analysis?.scores || {
    grammar: essay.grammar_score || 0,
    readability: essay.readability_score || 0,
    coherence: essay.coherence_score || 0,
    argument_strength: essay.argument_strength_score || 0,
    knowledge_graph: 0,
    overall: essay.overall_score || 0,
  };

  const recommendations: DiagnosticRecommendation[] =
    analysis?.recommendations ||
    (Array.isArray(essay.recommendations) && essay.recommendations.length > 0
      ? typeof essay.recommendations[0] === "object" &&
        "priority" in essay.recommendations[0]
        ? (essay.recommendations as DiagnosticRecommendation[])
        : (essay.recommendations as string[]).map((r: string) => ({
            priority: "medium" as const,
            dimension: "general",
            message: r,
            suggestion: "",
            action_items: [],
          }))
      : []);

  const diagnosticSummary = analysis?.diagnostic_summary;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Diagnostic Analysis Report"
      size="xl"
    >
      <div className="space-y-6">
        {/* Essay Header */}
        <Card className="bg-gradient-to-r from-primary-50 to-secondary-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                {essay.title}
              </h3>
              <div className="flex flex-wrap gap-4 text-sm text-neutral-600">
                <span>Student ID: {essay.student_id}</span>
                {analysis && (
                  <>
                    <span>Word Count: {analysis.word_count}</span>
                    <span>
                      Analyzed:{" "}
                      {new Date(analysis.generated_at).toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            </div>
            {!analysis && essay.status !== "analyzed" && (
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-4 py-2 bg-primary text-white rounded-rd hover:bg-primary-dark disabled:opacity-50"
              >
                {loading ? "Analyzing..." : "Run Analysis"}
              </button>
            )}
          </div>
        </Card>

        {/* Diagnostic Summary - Quick Reference for Teachers */}
        {diagnosticSummary && (
          <Card className="border-l-4 border-l-primary">
            <div className="flex items-start space-x-4">
              <BarChart3 className="w-6 h-6 text-primary mt-1" />
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-neutral-900 mb-3">
                  Diagnostic Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-neutral-600 mb-1">
                      Overall Score
                    </p>
                    <p className="text-3xl font-bold text-primary">
                      {diagnosticSummary.overall_score.toFixed(1)}
                    </p>
                  </div>
                  {diagnosticSummary.strengths.length > 0 && (
                    <div>
                      <p className="text-sm text-neutral-600 mb-1">Strengths</p>
                      <div className="flex flex-wrap gap-1">
                        {diagnosticSummary.strengths.map((s) => (
                          <Badge key={s} variant="success" size="sm">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {diagnosticSummary.weaknesses.length > 0 && (
                    <div>
                      <p className="text-sm text-neutral-600 mb-1">
                        Areas to Improve
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {diagnosticSummary.weaknesses.map((w) => (
                          <Badge key={w} variant="warning" size="sm">
                            {w}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {diagnosticSummary.critical_issues.length > 0 && (
                  <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-rd">
                    <p className="text-sm font-semibold text-error-dark mb-2">
                      Critical Issues:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-neutral-700">
                      {diagnosticSummary.critical_issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-neutral-200">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "detailed", label: "Detailed Analysis", icon: Layers },
            { id: "recommendations", label: "Recommendations", icon: Target },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id as "overview" | "detailed" | "recommendations"
                  )
                }
                className={`flex items-center space-x-2 px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "text-primary border-b-2 border-primary"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Overall Score */}
            <Card className="bg-gradient-to-r from-primary-50 to-secondary-50">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {scores.overall >= 80 ? (
                    <CheckCircle className="w-6 h-6 text-success-default" />
                  ) : scores.overall >= 60 ? (
                    <AlertTriangle className="w-6 h-6 text-warning-default" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-error-default" />
                  )}
                  <h4 className="text-xl font-bold text-neutral-900">
                    Overall Score
                  </h4>
                </div>
                <div className="text-5xl font-bold text-primary mb-3">
                  {Math.round(scores.overall)}/100
                </div>
                <ProgressBar
                  value={scores.overall}
                  color={getScoreColor(scores.overall)}
                  size="lg"
                />
              </div>
            </Card>

            {/* Dimension Scores Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  label: "Argumentation",
                  icon: FileText,
                  color: "tertiary",
                },
                {
                  key: "knowledge_graph",
                  label: "Conceptual Understanding",
                  icon: Network,
                  color: "secondary",
                },
              ].map(({ key, label, icon: Icon, color }) => {
                const score = scores[key as keyof typeof scores] || 0;
                if (key === "knowledge_graph" && !analysis) return null;
                return (
                  <Card key={key}>
                    <div className="text-center">
                      <Icon className={`w-8 h-8 text-${color} mx-auto mb-2`} />
                      <h5 className="font-semibold text-neutral-900 mb-1">
                        {label}
                      </h5>
                      <div className={`text-2xl font-bold text-${color} mb-2`}>
                        {Math.round(score)}
                      </div>
                      <ProgressBar
                        value={score}
                        color={getScoreColor(score)}
                        size="sm"
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Analysis Tab */}
        {activeTab === "detailed" && analysis && (
          <div className="space-y-6">
            {/* Grammar Analysis */}
            {analysis.detailed_analysis.grammar && (
              <Card>
                <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                  <BookOpen className="w-5 h-5 text-primary mr-2" />
                  Grammar Analysis
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Score</span>
                    <span className="font-semibold">
                      {analysis.detailed_analysis.grammar.score.toFixed(1)}/100
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
                  {analysis.detailed_analysis.grammar.errors.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-neutral-700">
                        Top Issues:
                      </p>
                      {analysis.detailed_analysis.grammar.errors
                        .slice(0, 5)
                        .map((error, idx) => (
                          <div
                            key={idx}
                            className="bg-error-50 border border-error-200 rounded p-2"
                          >
                            <Badge variant="error" size="sm" className="mb-1">
                              {error.type}
                            </Badge>
                            <p className="text-sm text-neutral-700">
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
                <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 text-success-default mr-2" />
                  Readability Metrics
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

            {/* Toulmin Argument Analysis */}
            {analysis.detailed_analysis.argumentation && (
              <Card>
                <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 text-tertiary mr-2" />
                  Toulmin's Model Analysis
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-primary-50 rounded-rd">
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
                {analysis.detailed_analysis.argumentation.thesis_statement && (
                  <div className="mt-4 p-3 bg-primary-50 rounded-rd">
                    <p className="text-sm font-medium text-neutral-700 mb-1">
                      Thesis Statement:
                    </p>
                    <p className="text-sm text-neutral-600 italic">
                      "
                      {
                        analysis.detailed_analysis.argumentation
                          .thesis_statement.sentence
                      }
                      "
                    </p>
                  </div>
                )}
                <div className="mt-6">
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
                <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                  <Network className="w-5 h-5 text-secondary mr-2" />
                  Conceptual Understanding
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
                        analysis.detailed_analysis.knowledge_graph.relationships
                          .length
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
          </div>
        )}

        {/* Recommendations Tab - Actionable Insights */}
        {activeTab === "recommendations" && (
          <div className="space-y-4">
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
                        <div
                          className={`p-2 rounded-rs ${
                            recommendation.priority === "high"
                              ? "bg-error-100 text-error-default"
                              : recommendation.priority === "medium"
                              ? "bg-warning-100 text-warning-default"
                              : "bg-info-100 text-info-default"
                          }`}
                        >
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
                          <h5 className="font-semibold text-neutral-900 mb-2">
                            {recommendation.message}
                          </h5>
                          {recommendation.suggestion && (
                            <p className="text-sm text-neutral-700 mb-3">
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

export default EnhancedEssayAnalysisModal;
