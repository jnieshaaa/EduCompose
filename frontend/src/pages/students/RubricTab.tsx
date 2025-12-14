import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Progress } from '../../components/ui/progress';
import { Info } from 'lucide-react';

const rubricData = {
  name: 'Standard Essay Rubric',
  description: 'This rubric is used to evaluate your essays based on multiple criteria',
  appliedTo: 'Computer Science 101 - Section A',
  criteria: [
    {
      name: 'Grammar & Mechanics',
      weight: 20,
      scoreRange: '0-100',
      description: 'Proper use of grammar, spelling, and punctuation',
      yourScore: 92,
      levels: [
        { range: '90-100', label: 'Excellent', description: 'Virtually no errors; demonstrates mastery of grammar and mechanics' },
        { range: '80-89', label: 'Good', description: 'Few minor errors; strong command of grammar' },
        { range: '70-79', label: 'Satisfactory', description: 'Some errors that don\'t impede understanding' },
        { range: '60-69', label: 'Needs Improvement', description: 'Multiple errors that occasionally affect clarity' },
        { range: '0-59', label: 'Unsatisfactory', description: 'Frequent errors that significantly impact readability' },
      ]
    },
    {
      name: 'Coherence & Flow',
      weight: 20,
      scoreRange: '0-100',
      description: 'Logical organization and smooth transitions between ideas',
      yourScore: 85,
      levels: [
        { range: '90-100', label: 'Excellent', description: 'Ideas flow seamlessly with strong transitions' },
        { range: '80-89', label: 'Good', description: 'Clear organization with effective transitions' },
        { range: '70-79', label: 'Satisfactory', description: 'Generally organized with adequate transitions' },
        { range: '60-69', label: 'Needs Improvement', description: 'Somewhat disorganized; weak transitions' },
        { range: '0-59', label: 'Unsatisfactory', description: 'Lacks clear organization and logical flow' },
      ]
    },
    {
      name: 'Argument Strength',
      weight: 25,
      scoreRange: '0-100',
      description: 'Clarity and persuasiveness of main arguments',
      yourScore: 80,
      levels: [
        { range: '90-100', label: 'Excellent', description: 'Compelling arguments with strong evidence' },
        { range: '80-89', label: 'Good', description: 'Clear arguments well-supported by evidence' },
        { range: '70-79', label: 'Satisfactory', description: 'Arguments present but need more support' },
        { range: '60-69', label: 'Needs Improvement', description: 'Weak or unclear arguments' },
        { range: '0-59', label: 'Unsatisfactory', description: 'No clear argument or thesis' },
      ]
    },
    {
      name: 'Vocabulary Usage',
      weight: 15,
      scoreRange: '0-100',
      description: 'Appropriate and varied word choice',
      yourScore: 88,
      levels: [
        { range: '90-100', label: 'Excellent', description: 'Sophisticated and precise vocabulary' },
        { range: '80-89', label: 'Good', description: 'Strong vocabulary with good variety' },
        { range: '70-79', label: 'Satisfactory', description: 'Adequate vocabulary; some repetition' },
        { range: '60-69', label: 'Needs Improvement', description: 'Limited vocabulary; frequent repetition' },
        { range: '0-59', label: 'Unsatisfactory', description: 'Very limited or inappropriate word choice' },
      ]
    },
    {
      name: 'Structure & Organization',
      weight: 15,
      scoreRange: '0-100',
      description: 'Clear introduction, body, and conclusion',
      yourScore: 82,
      levels: [
        { range: '90-100', label: 'Excellent', description: 'Exceptionally well-structured with clear sections' },
        { range: '80-89', label: 'Good', description: 'Well-organized with distinct sections' },
        { range: '70-79', label: 'Satisfactory', description: 'Basic structure present' },
        { range: '60-69', label: 'Needs Improvement', description: 'Weak or unclear structure' },
        { range: '0-59', label: 'Unsatisfactory', description: 'No clear structure or organization' },
      ]
    },
    {
      name: 'Originality / Plagiarism',
      weight: 5,
      scoreRange: '0-100',
      description: 'Original content with proper citations',
      yourScore: 95,
      levels: [
        { range: '90-100', label: 'Excellent', description: 'Highly original with proper citations' },
        { range: '80-89', label: 'Good', description: 'Original work with minor citation issues' },
        { range: '70-79', label: 'Satisfactory', description: 'Mostly original; some citation concerns' },
        { range: '60-69', label: 'Needs Improvement', description: 'Several plagiarism or citation issues' },
        { range: '0-59', label: 'Unsatisfactory', description: 'Significant plagiarism detected' },
      ]
    },
  ]
};

export function RubricTab() {
  const getCriteriaColor = (score: number) => {
    if (score >= 90) return 'text-success-default';
    if (score >= 80) return 'text-info-default';
    if (score >= 70) return 'text-warning-default';
    return 'text-error-default';
  };

  const getLevelColor = (score: number, range: string) => {
    const [min, max] = range.split('-').map(n => parseInt(n));
    if (score >= min && score <= max) {
      return 'bg-primary/10 border-primary text-primary';
    }
    return 'bg-neutral-50 border-neutral-200 text-neutral-600';
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl text-neutral-900">Rubric / Grading Criteria</h1>
        <p className="text-sm text-neutral-500 mt-1">Understanding how your essays are evaluated</p>
      </div>

      {/* Rubric Info */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-support/10 border-primary/20">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl text-neutral-900 mb-2">{rubricData.name}</h2>
            <p className="text-neutral-600 mb-2">{rubricData.description}</p>
            <Badge className="bg-primary/20 text-primary">Applied to: {rubricData.appliedTo}</Badge>
          </div>
        </div>
      </Card>

      {/* Criteria Overview */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Criteria Overview</h2>
        <div className="space-y-3">
          {rubricData.criteria.map((criterion, idx) => (
            <div key={idx} className="p-4 bg-neutral-50 rounded-rd border border-neutral-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-neutral-900">{criterion.name}</h3>
                    <Badge variant="outline" className="text-xs">Weight: {criterion.weight}%</Badge>
                  </div>
                  <p className="text-sm text-neutral-500">{criterion.description}</p>
                </div>
                {criterion.yourScore && (
                  <div className="text-right ml-4">
                    <p className="text-xs text-neutral-500 mb-1">Your Score</p>
                    <p className={`text-2xl ${getCriteriaColor(criterion.yourScore)}`}>
                      {criterion.yourScore}%
                    </p>
                  </div>
                )}
              </div>
              {criterion.yourScore && (
                <Progress value={criterion.yourScore} className="h-2 mb-2" />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Detailed Criteria Levels */}
      <div className="space-y-6">
        {rubricData.criteria.map((criterion, idx) => (
          <Card key={idx} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl text-neutral-900 mb-1">{criterion.name}</h3>
                <p className="text-sm text-neutral-500">{criterion.description}</p>
              </div>
              <Badge className="bg-neutral-100 text-neutral-900">
                Weight: {criterion.weight}%
              </Badge>
            </div>

            <div className="space-y-3">
              {criterion.levels.map((level, levelIdx) => (
                <div
                  key={levelIdx}
                  className={`p-4 rounded-rd border-2 transition-all ${
                    criterion.yourScore && getLevelColor(criterion.yourScore, level.range)
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-white">
                        {level.range}
                      </Badge>
                      <h4 className="font-semibold">{level.label}</h4>
                    </div>
                    {criterion.yourScore && 
                      parseInt(level.range.split('-')[0]) <= criterion.yourScore &&
                      criterion.yourScore <= parseInt(level.range.split('-')[1]) && (
                        <Badge className="bg-primary text-white">Your Level</Badge>
                      )}
                  </div>
                  <p className="text-sm text-neutral-600">{level.description}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* How to Improve */}
      <Card className="p-6 bg-gradient-to-br from-info-default/5 to-success-default/5 border-info-default/20">
        <h2 className="text-xl text-neutral-900 mb-3">💡 How to Use This Rubric</h2>
        <ul className="space-y-2 text-sm text-neutral-700">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Each criterion is evaluated independently and then weighted to calculate your overall score</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Focus on criteria with lower scores to improve your overall performance</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>The AI evaluates your essay against each criterion and provides specific feedback</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Your teacher may also add their own evaluation and comments based on this rubric</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
