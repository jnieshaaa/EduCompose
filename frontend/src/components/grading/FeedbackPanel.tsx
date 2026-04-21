
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
      <Card variant="glass" className="text-center py-16 border-success-100/30">
        <div className="p-4 bg-success-50/50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <Award className="w-10 h-10 text-success-default" />
        </div>
        <p className="text-xl md:text-2xl font-black text-neutral-900 tracking-tight mb-2">Excellent Technical Merit</p>
        <p className="text-sm font-medium text-neutral-500 max-w-xs mx-auto">
          No structural anomalies detected. The manuscript demonstrates high-tier academic proficiency.
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
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
        <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">
          Diagnostic Insights ({recommendations.length})
        </h3>
        <div className="flex items-center gap-2">
          {recommendations.filter((r) => r.priority === 'high').length > 0 && (
            <Badge variant="error" size="sm" className="rounded-lg font-black text-[10px] bg-error-50/50">
              {recommendations.filter((r) => r.priority === 'high').length} CRITICAL
            </Badge>
          )}
          {recommendations.filter((r) => r.priority === 'medium').length > 0 && (
            <Badge variant="warning" size="sm" className="rounded-lg font-black text-[10px] bg-warning-50/50">
              {recommendations.filter((r) => r.priority === 'medium').length} ELEVATED
            </Badge>
          )}
        </div>
      </div>

      {/* Recommendation Stream */}
      <div className="space-y-4">
        {sortedRecommendations.map((recommendation, index) => {
          const priorityColor = recommendation.priority === 'high' ? 'border-l-error' : recommendation.priority === 'medium' ? 'border-l-warning' : 'border-l-info';
          const iconColor = recommendation.priority === 'high' ? 'text-error-default' : recommendation.priority === 'medium' ? 'text-warning-default' : 'text-info-default';
          const bgColor = recommendation.priority === 'high' ? 'bg-error-50/20' : recommendation.priority === 'medium' ? 'bg-warning-50/20' : 'bg-info-50/20';

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card
                variant="glass"
                className={`relative border border-white/60 shadow-sm overflow-hidden border-l-4 ${priorityColor} ${bgColor}`}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div className={`p-1.5 md:p-2 bg-white rounded-xl shadow-sm ${iconColor} mt-1`}>
                    {getPriorityIcon(recommendation.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                       <Badge
                        variant={getPriorityColor(recommendation.priority) as 'error' | 'warning' | 'info' | 'neutral'}
                        size="sm"
                        className="rounded-lg font-black text-[8px] uppercase tracking-widest px-2"
                      >
                        {recommendation.priority}
                      </Badge>
                      <span className="text-neutral-300">|</span>
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{recommendation.dimension}</span>
                    </div>
                    <p className="text-base md:text-lg font-black text-neutral-900 tracking-tight mb-2 leading-snug">{recommendation.message}</p>
                    {recommendation.suggestion && (
                      <p className="text-xs font-medium text-neutral-500 mb-4 leading-relaxed">{recommendation.suggestion}</p>
                    )}
                    
                    {recommendation.action_items && recommendation.action_items.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/40">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-3.5 h-3.5 text-primary" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Protocol Action Items</span>
                        </div>
                        <ul className="space-y-2">
                          {recommendation.action_items.slice(0, 3).map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-start gap-2 md:gap-3 text-xs bg-white/30 p-2 rounded-xl border border-white/40 group hover:bg-white/60 transition-colors">
                              <div className="p-0.5 md:p-1 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors mt-0.5">
                                <ArrowRight className="w-2.5 h-2.5 text-primary" />
                              </div>
                              <span className="font-medium text-neutral-600 leading-normal">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default FeedbackPanel;

