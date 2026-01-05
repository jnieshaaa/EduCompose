import React, { useMemo } from 'react';
import {
  BookOpen,
  TrendingUp,
  Brain,
  Target,
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import ArgumentKnowledgeGraph from '../essay/ArgumentKnowledgeGraph';
import type { AnalysisResponse, GrammarError } from '../../types/Essay';
import type { HighlightError } from './EssayTextDisplay';

interface AnalysisMetricsProps {
  analysis: Omit<AnalysisResponse, 'essay_id'>;
  onErrorClick?: (error: HighlightError, index: number) => void;
  prominentGraph?: boolean;
}

// Category colors for grammar errors
const getCategoryColor = (category: string) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    grammar: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    capitalization: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    word_choice: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    spelling: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    punctuation: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  };
  return colors[category.toLowerCase()] || colors.grammar;
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
};

export function AnalysisMetrics({ analysis, onErrorClick, prominentGraph = false }: AnalysisMetricsProps) {
  const scores = analysis.scores || {
    grammar: 0,
    readability: 0,
    coherence: 0,
    argument_strength: 0,
    knowledge_graph: 0,
    overall: 0,
  };

  // Group grammar errors by category/type and deduplicate by message
  const groupedGrammarErrors = useMemo(() => {
    if (!analysis?.detailed_analysis?.grammar?.errors) return {};

    const grouped: Record<
      string,
      Array<{
        message: string;
        count: number;
        errors: GrammarError[];
      }>
    > = {};

    analysis.detailed_analysis.grammar.errors.forEach((error) => {
      const category = error.type || 'grammar';
      if (!grouped[category]) {
        grouped[category] = [];
      }

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

  // Create a flat list of errors with their original indices for clicking
  const errorsList = useMemo(() => {
    const errors = analysis?.detailed_analysis?.grammar?.errors || [];
    return errors.map((error, index) => ({
      ...error,
      originalIndex: index,
    }));
  }, [analysis]);

  const handleErrorGroupClick = (errors: GrammarError[]) => {
    if (onErrorClick && errors.length > 0) {
      // Find the original index of the first error
      const firstError = errors[0];
      const originalIndex = errorsList.findIndex(
        (e) => e.offset === firstError.offset && e.message === firstError.message
      );
      if (originalIndex >= 0) {
        onErrorClick(firstError as HighlightError, originalIndex);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Score Card */}
      <Card className="bg-gradient-to-br from-primary-50 to-white">
        <div className="text-center">
          <p className="text-sm text-neutral-600 mb-1">Overall Score</p>
          <div className="text-4xl font-bold text-primary mb-2">{Math.round(scores.overall)}</div>
          <ProgressBar value={scores.overall} color={getScoreColor(scores.overall)} size="md" />
        </div>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <h4 className="text-sm font-semibold text-neutral-700 mb-3">Score Breakdown</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'grammar', label: 'Grammar', icon: BookOpen, color: 'text-red-500' },
            { key: 'readability', label: 'Readability', icon: TrendingUp, color: 'text-green-500' },
            { key: 'coherence', label: 'Coherence', icon: Brain, color: 'text-blue-500' },
            { key: 'argument_strength', label: 'Argument', icon: Target, color: 'text-amber-500' },
          ].map(({ key, label, icon: Icon, color }) => {
            const score = scores[key as keyof typeof scores] || 0;
            return (
              <div key={key} className="flex items-center space-x-2 p-2 bg-neutral-50 rounded-lg">
                <Icon className={`w-4 h-4 ${color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-600 truncate">{label}</p>
                  <p className="text-sm font-semibold">{Math.round(score)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Argument Structure (Toulmin's Model) - Knowledge Graph */}
      {analysis.detailed_analysis?.argumentation && (
        <Card className={prominentGraph ? 'border-2 border-primary/20 shadow-lg' : ''}>
          <div className="flex items-center justify-between mb-4">
            <h4 className={`font-semibold text-neutral-800 ${prominentGraph ? 'text-lg' : 'text-sm'}`}>
              Argument Knowledge Graph
            </h4>
            {prominentGraph && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                Toulmin's Model
              </span>
            )}
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="text-center p-2 bg-primary-50 rounded-lg">
              <p className="text-xs text-neutral-500">Claims</p>
              <p className={`font-bold text-primary ${prominentGraph ? 'text-xl' : 'text-lg'}`}>
                {analysis.detailed_analysis.argumentation.argument_structure.total_claims}
              </p>
            </div>
            <div className="text-center p-2 bg-success-50 rounded-lg">
              <p className="text-xs text-neutral-500">Evidence</p>
              <p className={`font-bold text-success-default ${prominentGraph ? 'text-xl' : 'text-lg'}`}>
                {analysis.detailed_analysis.argumentation.argument_structure.total_grounds}
              </p>
            </div>
            <div className="text-center p-2 bg-info-50 rounded-lg">
              <p className="text-xs text-neutral-500">Warrants</p>
              <p className={`font-bold text-info-default ${prominentGraph ? 'text-xl' : 'text-lg'}`}>
                {analysis.detailed_analysis.argumentation.argument_structure.total_warrants}
              </p>
            </div>
            <div className="text-center p-2 bg-warning-50 rounded-lg">
              <p className="text-xs text-neutral-500">Rebuttals</p>
              <p className={`font-bold text-warning-default ${prominentGraph ? 'text-xl' : 'text-lg'}`}>
                {analysis.detailed_analysis.argumentation.argument_structure.total_rebuttals}
              </p>
            </div>
          </div>
          
          {/* Argument Graph - Prominent with min-height 500px */}
          <div 
            className="border rounded-lg overflow-hidden bg-neutral-50"
            style={{ minHeight: prominentGraph ? '500px' : '300px' }}
          >
            <ArgumentKnowledgeGraph
              graph={analysis.detailed_analysis.argumentation.graph}
              metrics={analysis.detailed_analysis.argumentation.metrics}
            />
          </div>
        </Card>
      )}

      {/* Knowledge Graph Stats */}
      {analysis.detailed_analysis?.knowledge_graph && (
        <Card>
          <h4 className="text-sm font-semibold text-neutral-700 mb-3">Knowledge Graph</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center p-2 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-500">Concepts</p>
              <p className="text-lg font-semibold">
                {analysis.detailed_analysis.knowledge_graph.concepts.length}
              </p>
            </div>
            <div className="text-center p-2 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-500">Relationships</p>
              <p className="text-lg font-semibold">
                {analysis.detailed_analysis.knowledge_graph.relationships.length}
              </p>
            </div>
          </div>
          {analysis.detailed_analysis.knowledge_graph.concepts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {analysis.detailed_analysis.knowledge_graph.concepts.slice(0, 6).map((concept, idx) => (
                <Badge key={idx} variant="neutral" size="sm">
                  {concept.text}
                </Badge>
              ))}
              {analysis.detailed_analysis.knowledge_graph.concepts.length > 6 && (
                <Badge variant="neutral" size="sm">
                  +{analysis.detailed_analysis.knowledge_graph.concepts.length - 6} more
                </Badge>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Grammar Errors - Clickable */}
      {Object.keys(groupedGrammarErrors).length > 0 && (
        <Card>
          <h4 className="text-sm font-semibold text-neutral-700 mb-3">
            Grammar Issues ({analysis.detailed_analysis?.grammar?.error_count || 0})
          </h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(groupedGrammarErrors).map(([category, errorGroups]) => {
              const categoryColor = getCategoryColor(category);
              const totalCount = errorGroups.reduce((sum, g) => sum + g.count, 0);
              return (
                <div key={category}>
                  <div className="flex items-center space-x-2 mb-2">
                    <span
                      className={`${categoryColor.bg} ${categoryColor.text} px-2 py-0.5 text-xs font-medium rounded-full`}
                    >
                      {category}
                    </span>
                    <span className="text-xs text-neutral-400">
                      ({totalCount} {totalCount === 1 ? 'issue' : 'issues'})
                    </span>
                  </div>
                  <ul className="space-y-1 ml-2">
                    {errorGroups.slice(0, 3).map((errorGroup, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-neutral-600 cursor-pointer hover:text-primary hover:bg-primary-50 p-1.5 rounded transition-colors"
                        onClick={() => handleErrorGroupClick(errorGroup.errors)}
                      >
                        <span className="line-clamp-1">{errorGroup.message}</span>
                        {errorGroup.count > 1 && (
                          <span className="ml-1 text-neutral-400">({errorGroup.count})</span>
                        )}
                      </li>
                    ))}
                    {errorGroups.length > 3 && (
                      <li className="text-xs text-neutral-400 pl-1.5">
                        +{errorGroups.length - 3} more...
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Readability Metrics */}
      {analysis.detailed_analysis?.readability && (
        <Card>
          <h4 className="text-sm font-semibold text-neutral-700 mb-3">Readability</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-500">Flesch Ease</p>
              <p className="text-lg font-semibold">
                {analysis.detailed_analysis.readability.flesch_reading_ease.toFixed(0)}
              </p>
            </div>
            <div className="text-center p-2 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-500">Grade Level</p>
              <p className="text-lg font-semibold">
                {analysis.detailed_analysis.readability.flesch_kincaid_grade.toFixed(1)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default AnalysisMetrics;

