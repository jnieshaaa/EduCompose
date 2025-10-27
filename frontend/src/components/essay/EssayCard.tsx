import React from "react";
import { motion } from "framer-motion";
import { Clock, BookOpen, TrendingUp, AlertCircle } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import ProgressBar from "../ui/ProgressBar";
import type { Essay } from "../../types/Essay";

interface EssayCardProps {
  essay: Essay;
  onClick?: () => void;
  onAnalyze?: () => void;
  showStudent?: boolean;
}

const EssayCard: React.FC<EssayCardProps> = ({
  essay,
  onClick,
  onAnalyze,
  showStudent = true,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "warning";
      case "analyzed":
        return "info";
      case "reviewed":
        return "success";
      default:
        return "neutral";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "error";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card hover={!!onClick} onClick={onClick} className="h-full">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-neutral-900 truncate">
                {essay.title}
              </h3>
              {showStudent && (
                <p className="text-sm text-neutral-500 mt-1">
                  Student ID: {essay.student_id}
                </p>
              )}
            </div>
            <Badge variant={getStatusColor(essay.status)} size="sm">
              {essay.status}
            </Badge>
          </div>

          {/* Content Preview */}
          <div className="text-sm text-neutral-600 line-clamp-3">
            {essay.content.substring(0, 150)}...
          </div>

          {/* Scores */}
          {essay.overall_score !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">
                  Overall Score
                </span>
                <span className="text-sm font-semibold text-neutral-900">
                  {Math.round(essay.overall_score)}/100
                </span>
              </div>
              <ProgressBar
                value={essay.overall_score}
                color={getScoreColor(essay.overall_score)}
                size="sm"
              />
            </div>
          )}

          {/* Detailed Scores */}
          {essay.status === "analyzed" && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {essay.grammar_score !== undefined && (
                <div className="flex items-center space-x-1">
                  <BookOpen className="w-3 h-3 text-primary" />
                  <span className="text-neutral-600">Grammar:</span>
                  <span className="font-medium">
                    {Math.round(essay.grammar_score)}
                  </span>
                </div>
              )}
              {essay.readability_score !== undefined && (
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-success-default" />
                  <span className="text-neutral-600">Readability:</span>
                  <span className="font-medium">
                    {Math.round(essay.readability_score)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Issues Count */}
          {essay.grammar_errors && essay.grammar_errors.length > 0 && (
            <div className="flex items-center space-x-1 text-sm text-error-default">
              <AlertCircle className="w-4 h-4" />
              <span>{essay.grammar_errors.length} grammar issues</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
            <div className="flex items-center space-x-1 text-xs text-neutral-500">
              <Clock className="w-3 h-3" />
              <span>{formatDate(essay.submitted_at)}</span>
            </div>

            {essay.status === "submitted" && onAnalyze && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onAnalyze();
                }}
                className="px-3 py-1 text-xs font-medium text-primary bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Analyze
              </motion.button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default EssayCard;
