import { useMemo } from 'react';
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
  onErrorClick?: (error: HighlightError) => void;
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

  const handleErrorGroupClick = (errors: GrammarError[]) => {
    if (onErrorClick && errors.length > 0) {
      onErrorClick(errors[0] as HighlightError);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Card - Executive HUD style */}
      <Card variant="glass" className="bg-gradient-to-br from-primary-50/40 to-white/40 border-primary-100/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-200/20 blur-[60px] rounded-full -mr-16 -mt-16" />
        <div className="relative z-10 text-center py-4">
          <p className="text-[10px] font-black text-primary/70 uppercase tracking-[0.2em] mb-3">Academic Proficiency Index</p>
          <div className="text-6xl font-black text-neutral-900 tracking-tighter mb-4 leading-none">
            {Math.round(scores.overall)}<span className="text-xl text-primary/50 ml-1">%</span>
          </div>
          <ProgressBar value={scores.overall} color={getScoreColor(scores.overall)} size="sm" className="h-1.5 rounded-full" />
        </div>
      </Card>

      {/* Score Breakdown - Modern Diagnostic Grid */}
      <Card variant="glass" className="border-white/50">
        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-6 border-b border-neutral-100 pb-3">Proficiency Breakdown</h4>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'grammar', label: 'Grammar', icon: BookOpen, color: 'text-error-default' },
            { key: 'readability', label: 'Readability', icon: TrendingUp, color: 'text-success-default' },
            { key: 'coherence', label: 'Coherence', icon: Brain, color: 'text-primary' },
            { key: 'argument_strength', label: 'Argument', icon: Target, color: 'text-warning-default' },
          ].map(({ key, label, icon: Icon, color }) => {
            const score = scores[key as keyof typeof scores] || 0;
            return (
              <div key={key} className="flex items-center gap-3 p-3 bg-white/40 border border-white/60 rounded-2xl shadow-sm hover:bg-white/60 transition-colors group">
                <div className={`p-2 rounded-xl bg-white shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-neutral-400 uppercase leading-none mb-1">{label}</p>
                  <p className="text-sm font-black text-neutral-900">{Math.round(score)}<span className="text-[10px] text-neutral-400 ml-0.5">%</span></p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Argument Structure - Toumils Model */}
      {analysis.detailed_analysis?.argumentation && (
        <Card variant="glass" className={prominentGraph ? 'border-primary-200/40 shadow-xl p-0 overflow-hidden' : 'p-0 overflow-hidden'}>
          <div className="p-6 pb-0 flex items-center justify-between mb-6">
            <h4 className={`font-black text-neutral-900 tracking-tight ${prominentGraph ? 'text-2xl' : 'text-sm uppercase tracking-widest'}`}>
              Manuscript <span className="text-primary">Architecture</span>
            </h4>
            <div className="flex items-center gap-2">
               <Badge variant="primary" size="sm" className="rounded-lg px-3 py-1 font-black text-[9px] uppercase tracking-widest bg-primary/10 text-primary border-primary-200/50">Toulmin's Protocol</Badge>
            </div>
          </div>
          
          <div className="px-6 grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Claims', val: analysis.detailed_analysis.argumentation.argument_structure.total_claims, bg: 'bg-primary-50/50', txt: 'text-primary' },
              { label: 'Evidence', val: analysis.detailed_analysis.argumentation.argument_structure.total_grounds, bg: 'bg-success-50/50', txt: 'text-success-default' },
              { label: 'Warrants', val: analysis.detailed_analysis.argumentation.argument_structure.total_warrants, bg: 'bg-info-50/50', txt: 'text-info-default' },
              { label: 'Rebuttals', val: analysis.detailed_analysis.argumentation.argument_structure.total_rebuttals, bg: 'bg-error-50/50', txt: 'text-error-default' },
            ].map((stat) => (
              <div key={stat.label} className={`text-center p-3 ${stat.bg} border border-white backdrop-blur-sm rounded-2xl shadow-sm`}>
                <p className="text-[8px] font-black text-neutral-400 uppercase tracking-tight mb-1">{stat.label}</p>
                <p className={`font-black tracking-tighter ${stat.txt} ${prominentGraph ? 'text-2xl' : 'text-lg'}`}>
                  {stat.val}
                </p>
              </div>
            ))}
          </div>
          
          <div 
            className="border-t border-neutral-100 bg-neutral-900/5 backdrop-blur-sm overflow-hidden"
            style={{ minHeight: prominentGraph ? '600px' : '300px' }}
          >
            <ArgumentKnowledgeGraph
              graph={analysis.detailed_analysis.argumentation.graph}
              metrics={analysis.detailed_analysis.argumentation.metrics}
            />
          </div>
        </Card>
      )}

      {/* Grammar Anomaly HUD */}
      {Object.keys(groupedGrammarErrors).length > 0 && (
        <Card variant="glass" className="border-error-100/30 overflow-hidden">
          <div className="flex items-center justify-between mb-5 border-b border-neutral-100 pb-4">
             <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
               Grammar Diagnostics
             </h4>
             <Badge variant="error" size="sm" className="rounded-lg px-2.5 py-1 font-black text-[10px]">{analysis.detailed_analysis?.grammar?.error_count || 0} Anomalies</Badge>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
            {Object.entries(groupedGrammarErrors).map(([category, errorGroups]) => {
              const categoryColor = getCategoryColor(category);
              return (
                <div key={category} className="bg-white/40 p-4 rounded-2xl border border-white shadow-sm hover:border-primary-100 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`${categoryColor.bg} ${categoryColor.text} px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${categoryColor.border}`}>
                      {category}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {errorGroups.slice(0, 4).map((errorGroup, idx) => (
                      <li
                        key={idx}
                        className="group flex items-start gap-2 text-xs text-neutral-600 cursor-pointer hover:bg-white rounded-xl p-2 transition-all duration-300 border border-transparent hover:border-neutral-100"
                        onClick={() => handleErrorGroupClick(errorGroup.errors)}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mt-1.5 flex-shrink-0 group-hover:bg-primary transition-colors" />
                        <span className="line-clamp-2 font-medium flex-1">{errorGroup.message}</span>
                        {errorGroup.count > 1 && (
                          <Badge variant="neutral" size="sm" className="rounded-md px-1.5 py-0.5 text-[9px] bg-neutral-100 border-none font-black">×{errorGroup.count}</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Readability Scorecard */}
      {analysis.detailed_analysis?.readability && (
        <Card variant="glass" className="border-success-100/30">
          <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-5">Linguistic Readability</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-success-50/50 backdrop-blur-sm border border-white rounded-2xl text-center shadow-sm">
              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-tight mb-2">Flesch Index</p>
              <p className="text-2xl font-black text-success-default tracking-tighter">
                {analysis.detailed_analysis.readability.flesch_reading_ease.toFixed(0)}
              </p>
            </div>
            <div className="p-4 bg-primary-50/50 backdrop-blur-sm border border-white rounded-2xl text-center shadow-sm">
              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-tight mb-2">Academic Rank</p>
              <p className="text-2xl font-black text-primary tracking-tighter">
                Lvl {analysis.detailed_analysis.readability.flesch_kincaid_grade.toFixed(0)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default AnalysisMetrics;

