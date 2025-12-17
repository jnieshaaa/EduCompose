import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Target,
  ArrowRight,
  Award,
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import type { DiagnosticRecommendation } from '../../types/Essay';

interface FeedbackPanelProps {
  recommendations: DiagnosticRecommendation[];
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'neutral';
  }
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'high':
      return <AlertTriangle className="w-4 h-4" />;
    case 'medium':
      return <AlertCircle className="w-4 h-4" />;
    case 'low':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Lightbulb className="w-4 h-4" />;
  }
};

export function FeedbackPanel({ recommendations }: FeedbackPanelProps) {
  if (recommendations.length === 0) {
    return (
      <Card className="text-center py-8">
        <Award className="w-12 h-12 text-success-default mx-auto mb-3" />
        <p className="text-lg font-semibold text-neutral-900 mb-1">Excellent Work!</p>
        <p className="text-sm text-neutral-600">
          No specific recommendations. Overall writing quality is good!
        </p>
      </Card>
    );
  }

  // Sort by priority: high > medium > low
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (
      (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3)
    );
  });

  return (
    <div className="space-y-3">
      {/* Summary Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-700">
          {recommendations.length} Recommendations
        </h3>
        <div className="flex items-center space-x-2">
          {recommendations.filter((r) => r.priority === 'high').length > 0 && (
            <Badge variant="error" size="sm">
              {recommendations.filter((r) => r.priority === 'high').length} High
            </Badge>
          )}
          {recommendations.filter((r) => r.priority === 'medium').length > 0 && (
            <Badge variant="warning" size="sm">
              {recommendations.filter((r) => r.priority === 'medium').length} Medium
            </Badge>
          )}
        </div>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-3">
        {sortedRecommendations.map((recommendation, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={`border-l-4 ${
                recommendation.priority === 'high'
                  ? 'border-l-error'
                  : recommendation.priority === 'medium'
                  ? 'border-l-warning'
                  : 'border-l-info'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`flex-shrink-0 mt-0.5 ${
                    recommendation.priority === 'high'
                      ? 'text-error-default'
                      : recommendation.priority === 'medium'
                      ? 'text-warning-default'
                      : 'text-info-default'
                  }`}
                >
                  {getPriorityIcon(recommendation.priority)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-1.5 mb-2">
                    <Badge
                      variant={getPriorityColor(recommendation.priority) as 'error' | 'warning' | 'info' | 'neutral'}
                      size="sm"
                    >
                      {recommendation.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="neutral" size="sm">
                      {recommendation.dimension}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-neutral-900 mb-1">{recommendation.message}</p>
                  {recommendation.suggestion && (
                    <p className="text-xs text-neutral-600 mb-2">{recommendation.suggestion}</p>
                  )}
                  {recommendation.action_items && recommendation.action_items.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-neutral-100">
                      <p className="text-xs font-medium text-neutral-600 mb-1.5 flex items-center">
                        <Target className="w-3 h-3 mr-1" />
                        Action Items:
                      </p>
                      <ul className="space-y-1">
                        {recommendation.action_items.slice(0, 3).map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start text-xs text-neutral-600">
                            <ArrowRight className="w-3 h-3 mr-1.5 mt-0.5 text-primary flex-shrink-0" />
                            <span className="line-clamp-2">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default FeedbackPanel;

