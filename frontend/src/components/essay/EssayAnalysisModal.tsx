import React from "react";
import { motion } from "framer-motion";
import {
  X,
  BookOpen,
  TrendingUp,
  Brain,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
} from "lucide-react";
import Modal from "../ui/Modal";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import ProgressBar from "../ui/ProgressBar";
import type { Essay } from "../../types/Essay";

interface EssayAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  essay: Essay & {
    overall_score?: number;
    grammar_score?: number;
    readability_score?: number;
    coherence_score?: number;
    argument_strength_score?: number;
  };
}

const EssayAnalysisModal: React.FC<EssayAnalysisModalProps> = ({
  isOpen,
  onClose,
  essay,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "error";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80)
      return <CheckCircle className="w-5 h-5 text-success-default" />;
    if (score >= 60)
      return <AlertTriangle className="w-5 h-5 text-warning-default" />;
    return <AlertTriangle className="w-5 h-5 text-error-default" />;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Essay Analysis" size="xl">
      <div className="space-y-6">
        {/* Essay Header */}
        <div className="bg-neutral-50 rounded-rd p-4">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            {essay.title}
          </h3>
          <p className="text-sm text-neutral-600">
            Student ID: {essay.student_id}
          </p>
        </div>

        {/* Overall Score */}
        {essay.overall_score !== undefined && (
          <Card className="bg-gradient-to-r from-primary-50 to-secondary-50">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                {getScoreIcon(essay.overall_score)}
                <h4 className="text-xl font-bold text-neutral-900">
                  Overall Score
                </h4>
              </div>
              <div className="text-4xl font-bold text-primary mb-2">
                {Math.round(essay.overall_score)}/100
              </div>
              <ProgressBar
                value={essay.overall_score}
                color={getScoreColor(essay.overall_score)}
                size="lg"
              />
            </div>
          </Card>
        )}

        {/* Detailed Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {essay.grammar_score !== undefined && (
            <Card>
              <div className="text-center">
                <BookOpen className="w-8 h-8 text-primary mx-auto mb-2" />
                <h5 className="font-semibold text-neutral-900 mb-1">Grammar</h5>
                <div className="text-2xl font-bold text-primary mb-2">
                  {Math.round(essay.grammar_score)}
                </div>
                <ProgressBar
                  value={essay.grammar_score}
                  color={getScoreColor(essay.grammar_score)}
                  size="sm"
                />
              </div>
            </Card>
          )}

          {essay.readability_score !== undefined && (
            <Card>
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-success-default mx-auto mb-2" />
                <h5 className="font-semibold text-neutral-900 mb-1">
                  Readability
                </h5>
                <div className="text-2xl font-bold text-success-default mb-2">
                  {Math.round(essay.readability_score)}
                </div>
                <ProgressBar
                  value={essay.readability_score}
                  color={getScoreColor(essay.readability_score)}
                  size="sm"
                />
              </div>
            </Card>
          )}

          {essay.coherence_score !== undefined && (
            <Card>
              <div className="text-center">
                <Brain className="w-8 h-8 text-info-default mx-auto mb-2" />
                <h5 className="font-semibold text-neutral-900 mb-1">
                  Coherence
                </h5>
                <div className="text-2xl font-bold text-info-default mb-2">
                  {Math.round(essay.coherence_score)}
                </div>
                <ProgressBar
                  value={essay.coherence_score}
                  color={getScoreColor(essay.coherence_score)}
                  size="sm"
                />
              </div>
            </Card>
          )}

          {essay.argument_strength_score !== undefined && (
            <Card>
              <div className="text-center">
                <Brain className="w-8 h-8 text-tertiary mx-auto mb-2" />
                <h5 className="font-semibold text-neutral-900 mb-1">
                  Argument
                </h5>
                <div className="text-2xl font-bold text-tertiary mb-2">
                  {Math.round(essay.argument_strength_score)}
                </div>
                <ProgressBar
                  value={essay.argument_strength_score}
                  color={getScoreColor(essay.argument_strength_score)}
                  size="sm"
                />
              </div>
            </Card>
          )}
        </div>

        {/* Grammar Errors */}
        {essay.grammar_errors && essay.grammar_errors.length > 0 && (
          <Card>
            <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 text-error-default mr-2" />
              Grammar Issues ({essay.grammar_errors.length})
            </h4>
            <div className="space-y-3">
              {essay.grammar_errors.map((error, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-error-50 border border-error-200 rounded-rd p-3"
                >
                  <div className="flex items-start space-x-2">
                    <Badge variant="error" size="sm">
                      {error.type}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm text-neutral-700 mb-1">
                        {error.message}
                      </p>
                      {error.suggestion && (
                        <p className="text-sm text-success-dark font-medium">
                          Suggestion: {error.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Style Issues */}
        {essay.style_issues && essay.style_issues.length > 0 && (
          <Card>
            <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 text-warning-default mr-2" />
              Style Issues ({essay.style_issues.length})
            </h4>
            <div className="space-y-3">
              {essay.style_issues.map((issue, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-warning-50 border border-warning-200 rounded-rd p-3"
                >
                  <div className="flex items-start space-x-2">
                    <Badge variant="warning" size="sm">
                      {issue.type}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm text-neutral-700 mb-1">
                        {issue.message}
                      </p>
                      {issue.suggestion && (
                        <p className="text-sm text-success-dark font-medium">
                          Suggestion: {issue.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Argument Analysis */}
        {essay.argument_analysis && (
          <Card>
            <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
              <Brain className="w-5 h-5 text-info-default mr-2" />
              Argument Analysis
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                    essay.argument_analysis.argumentation?.argument_structure
                      .has_thesis
                      ? "bg-success-100"
                      : "bg-error-100"
                  }`}
                >
                  {essay.argument_analysis.argumentation?.argument_structure
                    .has_thesis ? (
                    <CheckCircle className="w-6 h-6 text-success-default" />
                  ) : (
                    <X className="w-6 h-6 text-error-default" />
                  )}
                </div>
                <h5 className="font-medium text-neutral-900">
                  Thesis Statement
                </h5>
                <p className="text-sm text-neutral-600">
                  {essay.argument_analysis.argumentation?.argument_structure
                    .has_thesis
                    ? "Found"
                    : "Not Found"}
                </p>
              </div>

              <div className="text-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                    essay.argument_analysis.argumentation?.argument_structure
                      .has_evidence
                      ? "bg-success-100"
                      : "bg-error-100"
                  }`}
                >
                  {essay.argument_analysis.argumentation?.argument_structure
                    .has_evidence ? (
                    <CheckCircle className="w-6 h-6 text-success-default" />
                  ) : (
                    <X className="w-6 h-6 text-error-default" />
                  )}
                </div>
                <h5 className="font-medium text-neutral-900">
                  Supporting Evidence
                </h5>
                <p className="text-sm text-neutral-600">
                  {essay.argument_analysis.argumentation?.argument_structure
                    .has_evidence
                    ? "Found"
                    : "Limited"}
                </p>
              </div>

              <div className="text-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                    essay.argument_analysis.argumentation?.argument_structure
                      .has_reasoning
                      ? "bg-success-100"
                      : "bg-error-100"
                  }`}
                >
                  {essay.argument_analysis.argumentation?.argument_structure
                    .has_reasoning ? (
                    <CheckCircle className="w-6 h-6 text-success-default" />
                  ) : (
                    <X className="w-6 h-6 text-error-default" />
                  )}
                </div>
                <h5 className="font-medium text-neutral-900">Reasoning</h5>
                <p className="text-sm text-neutral-600">
                  {essay.argument_analysis.argumentation?.argument_structure
                    .has_reasoning
                    ? "Found"
                    : "Not Found"}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Recommendations */}
        {essay.recommendations && essay.recommendations.length > 0 && (
          <Card>
            <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 text-warning-default mr-2" />
              Recommendations
            </h4>
            <div className="space-y-2">
              {essay.recommendations.map((recommendation, index) => {
                const text =
                  typeof recommendation === "string"
                    ? recommendation
                    : recommendation.message;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-2 p-3 bg-primary-50 rounded-rd"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-neutral-700">{text}</p>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default EssayAnalysisModal;
