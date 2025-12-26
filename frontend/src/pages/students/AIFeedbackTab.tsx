import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Award, Download, MessageSquare, FileText } from 'lucide-react';
import { Progress } from '../../components/ui/progress';

const essayFeedback = {
  essayTitle: 'Machine Learning Ethics',
  submittedDate: '2025-12-09',
  overallScore: 85,
  aiConfidence: 92,
  criteria: [
    { name: 'Grammar & Mechanics', score: 92, weight: 20, feedback: 'Excellent grammar with minimal errors. Minor issues with comma usage in complex sentences.', improvements: ['Consider using semicolons to separate closely related independent clauses', 'Watch for comma splices in longer sentences'] },
    { name: 'Coherence & Flow', score: 85, weight: 20, feedback: 'Good logical flow between paragraphs. Some transitions could be smoother.', improvements: ['Add more transitional phrases between paragraphs 3 and 4', 'Strengthen the connection between your introduction and thesis'] },
    { name: 'Vocabulary Usage', score: 88, weight: 15, feedback: 'Strong vocabulary with appropriate academic language. Good variety in word choice.', improvements: ['Consider using more discipline-specific terminology', 'Avoid repeating "important" - use synonyms like "crucial," "significant"'] },
    { name: 'Structure & Organization', score: 82, weight: 15, feedback: 'Clear structure with well-defined paragraphs. Introduction and conclusion are strong.', improvements: ['Body paragraph 2 could be split into two separate arguments', 'Consider reorganizing points in ascending order of importance'] },
    { name: 'Argument Strength', score: 80, weight: 25, feedback: 'Arguments are generally well-supported. Some claims need additional evidence.', improvements: ['Provide more concrete examples in paragraph 4', 'Strengthen your counter-argument discussion with citations'] },
    { name: 'Originality', score: 95, weight: 5, feedback: 'Highly original content with proper citations. No plagiarism detected.', improvements: ['Excellent work on originality!'] },
  ],
  highlightedSuggestions: [
    { type: 'grammar', text: 'In paragraph 2, line 3: "Its important to note" should be "It\'s important to note"', severity: 'medium' },
    { type: 'coherence', text: 'Consider adding a transition sentence between paragraphs 3 and 4', severity: 'low' },
    { type: 'vocabulary', text: 'The word "good" appears 7 times. Consider using alternatives like "beneficial," "advantageous," or "favorable"', severity: 'low' },
    { type: 'structure', text: 'Paragraph 5 is significantly longer than others. Consider breaking it into two paragraphs', severity: 'medium' },
  ]
};

export function AIFeedbackTab() {
  const getCriteriaColor = (score: number) => {
    if (score >= 90) return 'text-success-default';
    if (score >= 80) return 'text-info-default';
    if (score >= 70) return 'text-warning-default';
    return 'text-error-default';
  };

  const getCriteriaBarColor = (score: number) => {
    if (score >= 90) return 'bg-success-default';
    if (score >= 80) return 'bg-info-default';
    if (score >= 70) return 'bg-warning-default';
    return 'bg-error-default';
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

  // Empty state
  const hasNoFeedback = false;
  if (hasNoFeedback) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="w-12 h-12 text-neutral-400" />
        </div>
        <h2 className="text-2xl text-neutral-900 mb-2">No AI feedback yet</h2>
        <p className="text-neutral-500 text-center max-w-md mb-6">
          Your essay is currently under evaluation. AI feedback will appear here once the evaluation is complete. This usually takes 2-5 minutes.
        </p>
        <Button variant="outline">
          View My Essays
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
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
            <strong>Overall:</strong> Your essay shows strong writing skills with an overall score of {essayFeedback.overallScore}%. 
            Focus on strengthening your arguments with more evidence and improving transitions between paragraphs.
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
