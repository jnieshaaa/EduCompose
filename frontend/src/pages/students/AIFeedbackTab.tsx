import { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Award, Download, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { Progress } from '../../components/ui/progress';
import { readSecureParams } from '../../utils/secureUrl';
import { fetchEssayAnalysis } from '../../services/activityService';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { useNavigate } from 'react-router-dom';

interface FeedbackData {
  essayTitle: string;
  submittedDate: string;
  overallScore: number;
  aiConfidence: number;
  criteria: Array<{
    name: string;
    score: number;
    weight: number;
    feedback: string;
    improvements: string[];
  }>;
  highlightedSuggestions: Array<{
    type: string;
    text: string;
    severity: string;
  }>;
  summary: string;
}

export function AIFeedbackTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [essayFeedback, setEssayFeedback] = useState<FeedbackData | null>(null);

  useEffect(() => {
    async function loadData() {
      const params = readSecureParams(window.location.search);
      if (!params || !params.studentId || !params.activityId) {
        // Fallback for demo if no ref provided
        if (!window.location.search.includes('ref=')) {
          setError("No essay identifiers provided. Please select an essay from your dashboard.");
          setLoading(false);
          return;
        }
        setError("Invalid request parameters.");
        setLoading(false);
        return;
      }

      try {
        const result = await fetchEssayAnalysis(params.studentId, params.activityId);
        if (!result) {
          setError("Could not find evaluation results for this essay.");
          return;
        }

        // Map backend AnalysisResponse to UI format
        const analysis = result.analysis as any;
        const mapped: FeedbackData = {
          essayTitle: params.activityTitle || result.title || "Essay Evaluation",
          submittedDate: analysis.generated_at ? new Date(analysis.generated_at).toLocaleDateString() : new Date().toLocaleDateString(),
          overallScore: Math.round(analysis.scores?.overall || 0),
          aiConfidence: Math.round(analysis.scores?.knowledge_graph || 95),
          summary: analysis.diagnostic_summary?.overall_summary || "Evaluation completed successfully.",
          criteria: [
            { 
              name: 'Grammar & Mechanics', 
              score: Math.round(analysis.scores?.grammar || 0), 
              weight: 20, 
              feedback: analysis.detailed_analysis?.grammar?.summary || "Analyzed grammar and syntax patterns.",
              improvements: analysis.recommendations?.filter((r: any) => r.dimension === 'grammar').flatMap((r: any) => r.action_items) || []
            },
            { 
              name: 'Coherence & Flow', 
              score: Math.round(analysis.scores?.coherence || 0), 
              weight: 25, 
              feedback: analysis.detailed_analysis?.coherence?.summary || "Evaluated logical flow and paragraph transitions.",
              improvements: analysis.recommendations?.filter((r: any) => r.dimension === 'coherence').flatMap((r: any) => r.action_items) || []
            },
            { 
              name: 'Vocabulary & Style', 
              score: Math.round(analysis.scores?.readability || 0), 
              weight: 15, 
              feedback: analysis.detailed_analysis?.readability?.summary || "Assessed academic vocabulary and reading ease.",
              improvements: analysis.recommendations?.filter((r: any) => r.dimension === 'readability').flatMap((r: any) => r.action_items) || []
            },
            { 
              name: 'Argument Strength', 
              score: Math.round(analysis.scores?.argument_strength || 0), 
              weight: 30, 
              feedback: analysis.detailed_analysis?.argumentation?.summary || "Evaluated claims, evidence, and logical reasoning.",
              improvements: analysis.recommendations?.filter((r: any) => r.dimension === 'argumentation').flatMap((r: any) => r.action_items) || []
            },
            { 
              name: 'Knowledge Integration', 
              score: Math.round(analysis.scores?.knowledge_graph || 0), 
              weight: 10, 
              feedback: "Assessed conceptual depth and knowledge graph connectivity.",
              improvements: analysis.recommendations?.filter((r: any) => r.dimension === 'knowledge_graph').flatMap((r: any) => r.action_items) || []
            }
          ],
          highlightedSuggestions: (analysis.recommendations || []).map((rec: any) => ({
            type: rec.dimension,
            text: `${rec.message}: ${rec.suggestion}`,
            severity: rec.priority
          }))
        };

        setEssayFeedback(mapped);
      } catch (err) {
        console.error("Error loading feedback:", err);
        setError("Failed to connect to the evaluation service.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const getCriteriaColor = (score: number) => {
    if (score >= 90) return 'text-success-default';
    if (score >= 80) return 'text-info-default';
    if (score >= 70) return 'text-warning-default';
    return 'text-error-default';
  };



  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-600 text-white text-xs">High Priority</Badge>;
      case 'medium':
        return <Badge className="bg-amber-600 text-white text-xs">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-600 text-white text-xs">Low Priority</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <PremiumLoader loading={true} message="Fetching AI Evaluation Results..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 bg-error-light/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-error-default" />
        </div>
        <h2 className="text-2xl text-neutral-900 mb-2 font-semibold">Unable to Load Feedback</h2>
        <p className="text-neutral-500 text-center max-w-md mb-8">
          {error}
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={() => navigate('/Student/MyEssays')}>
            Go to My Essays
          </Button>
        </div>
      </div>
    );
  }

  if (!essayFeedback) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900">AI Feedback</h1>
          <p className="text-sm text-neutral-500 mt-1">Detailed NLP-based evaluation of your essay</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button className="bg-primary hover:bg-primary-300">
            <FileText className="w-4 h-4 mr-2" />
            View Essay
          </Button>
        </div>
      </div>

      {/* Essay Info */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-support/10 border-primary/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl text-neutral-900 mb-1">{essayFeedback.essayTitle}</h2>
            <p className="text-sm text-neutral-500">Submitted on {essayFeedback.submittedDate}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-5 h-5 text-primary" />
                <span className="text-sm text-neutral-600">Overall Score</span>
              </div>
              <div className="text-3xl text-primary">{essayFeedback.overallScore}%</div>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Confidence */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-neutral-900">AI Evaluation Confidence</h3>
          <Badge className="bg-primary/10 text-primary">{essayFeedback.aiConfidence}% Confident</Badge>
        </div>
        <Progress value={essayFeedback.aiConfidence} className="h-2" />
        <p className="text-sm text-neutral-500 mt-2">
          This indicates how confident the AI is in its evaluation based on the clarity and structure of your essay.
        </p>
      </Card>

      {/* Criteria Breakdown */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Breakdown by Criteria</h2>
        <div className="space-y-6">
          {essayFeedback.criteria.map((criterion, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-neutral-900">{criterion.name}</h3>
                    <Badge variant="outline" className="text-xs bg-neutral-100 text-neutral-600">
                      Weight: {criterion.weight}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <Progress value={criterion.score} className="flex-1 h-2" />
                    <span className={`text-xl ${getCriteriaColor(criterion.score)}`}>
                      {criterion.score}%
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 mb-3">{criterion.feedback}</p>
                  {criterion.improvements.length > 0 && (
                    <div className="bg-info-default/5 border border-info-default/20 rounded-rd p-3">
                      <p className="text-sm text-neutral-900 mb-2">💡 Suggestions for improvement:</p>
                      <ul className="text-sm text-neutral-600 space-y-1 list-disc list-inside">
                        {criterion.improvements.map((improvement, i) => (
                          <li key={i}>{improvement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              {idx < essayFeedback.criteria.length - 1 && (
                <div className="border-t border-neutral-200 pt-1"></div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Highlighted Suggestions */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Highlighted Text Suggestions</h2>
        <div className="space-y-3">
          {essayFeedback.highlightedSuggestions.map((suggestion, idx) => (
            <div 
              key={idx} 
              className={`p-4 rounded-rd border-l-4 ${
                suggestion.severity === 'high' ? 'bg-error-light/10 border-error-default' :
                suggestion.severity === 'medium' ? 'bg-warning-light/10 border-warning-default' :
                'bg-info-light/10 border-info-default'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <Badge className={`text-xs ${
                  suggestion.type === 'grammar' ? 'bg-red-600 text-white' :
                  suggestion.type === 'coherence' ? 'bg-blue-600 text-white' :
                  suggestion.type === 'vocabulary' ? 'bg-amber-600 text-white' :
                  'bg-primary text-white'
                }`}>
                  {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
                </Badge>
                {getSeverityBadge(suggestion.severity)}
              </div>
              <p className="text-sm text-neutral-700">{suggestion.text}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary & Next Steps */}
      <Card className="p-6 bg-gradient-to-br from-success-default/5 to-info-default/5 border-success-default/20">
        <h2 className="text-xl text-neutral-900 mb-3">Summary & Next Steps</h2>
        <div className="space-y-3">
          <p className="text-neutral-700">
            {essayFeedback.summary}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button variant="outline" className="flex-1">
              View Full Essay with Highlights
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary-300">
              Revise & Resubmit
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
