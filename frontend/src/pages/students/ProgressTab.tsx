import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { TrendingUp, Target } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const scoresTrendData = [
  { essay: 'Essay 1', score: 75, date: 'Oct 15' },
  { essay: 'Essay 2', score: 78, date: 'Oct 22' },
  { essay: 'Essay 3', score: 82, date: 'Oct 29' },
  { essay: 'Essay 4', score: 80, date: 'Nov 5' },
  { essay: 'Essay 5', score: 85, date: 'Nov 12' },
  { essay: 'Essay 6', score: 88, date: 'Nov 19' },
  { essay: 'Essay 7', score: 87, date: 'Nov 26' },
  { essay: 'Essay 8', score: 89, date: 'Dec 3' },
  { essay: 'Essay 9', score: 92, date: 'Dec 10' },
];

const grammarErrorsData = [
  { essay: 'Essay 1', errors: 18 },
  { essay: 'Essay 2', errors: 16 },
  { essay: 'Essay 3', errors: 14 },
  { essay: 'Essay 4', errors: 15 },
  { essay: 'Essay 5', errors: 12 },
  { essay: 'Essay 6', errors: 10 },
  { essay: 'Essay 7', errors: 9 },
  { essay: 'Essay 8', errors: 7 },
  { essay: 'Essay 9', errors: 5 },
];

const vocabularyGrowthData = [
  { essay: 'Essay 1', level: 6.2 },
  { essay: 'Essay 2', level: 6.5 },
  { essay: 'Essay 3', level: 6.8 },
  { essay: 'Essay 4', level: 7.0 },
  { essay: 'Essay 5', level: 7.3 },
  { essay: 'Essay 6', level: 7.5 },
  { essay: 'Essay 7', level: 7.8 },
  { essay: 'Essay 8', level: 8.0 },
  { essay: 'Essay 9', level: 8.2 },
];

const strengthsWeaknessesData = [
  { criterion: 'Grammar', current: 92, target: 95 },
  { criterion: 'Coherence', current: 85, target: 90 },
  { criterion: 'Vocabulary', current: 88, target: 90 },
  { criterion: 'Structure', current: 82, target: 88 },
  { criterion: 'Arguments', current: 80, target: 90 },
  { criterion: 'Originality', current: 95, target: 95 },
];

const improvements = [
  { area: 'Grammar Accuracy', improvement: '+15%', status: 'excellent' },
  { area: 'Vocabulary Complexity', improvement: '+12%', status: 'good' },
  { area: 'Coherence Score', improvement: '+8%', status: 'good' },
  { area: 'Argument Strength', improvement: '+5%', status: 'moderate' },
];

const suggestions = [
  'Focus on strengthening your arguments with more evidence and examples',
  'Work on improving paragraph transitions for better coherence',
  'Continue building your vocabulary - your growth has been excellent',
  'Maintain your strong grammar and originality scores',
];

export function ProgressTab() {
  // Empty state
  const hasNoProgress = false;
  if (hasNoProgress) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <TrendingUp className="w-12 h-12 text-neutral-400" />
        </div>
        <h2 className="text-2xl text-neutral-900 mb-2">No progress data yet</h2>
        <p className="text-neutral-500 text-center max-w-md mb-6">
          Submit more essays to start tracking your improvement over time. You'll be able to see trends in your scores, grammar accuracy, and vocabulary growth.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl text-neutral-900">Progress & Analytics</h1>
        <p className="text-sm text-neutral-500 mt-1">Track your writing improvement over time</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {improvements.map((item, idx) => (
          <Card key={idx} className="p-4">
            <p className="text-sm text-neutral-500 mb-2">{item.area}</p>
            <div className="flex items-end justify-between">
              <div className={`text-2xl ${
                item.status === 'excellent' ? 'text-success-default' :
                item.status === 'good' ? 'text-info-default' :
                'text-warning-default'
              }`}>
                {item.improvement}
              </div>
              <TrendingUp className={`w-5 h-5 ${
                item.status === 'excellent' ? 'text-success-default' :
                item.status === 'good' ? 'text-info-default' :
                'text-warning-default'
              }`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Score Trend */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Score Trend Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={scoresTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="#0791B2" 
              strokeWidth={3} 
              dot={{ fill: '#0791B2', r: 5 }}
              name="Overall Score (%)"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 p-4 bg-success-default/10 rounded-rd border border-success-default/20">
          <p className="text-sm text-success-default">
            🎉 <strong>Great progress!</strong> Your scores have improved by 17 points since your first essay!
          </p>
        </div>
      </Card>

      {/* Grammar & Vocabulary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grammar Error Reduction */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">Grammar Error Reduction</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={grammarErrorsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" />
              <XAxis dataKey="essay" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="errors" fill="#10B981" radius={[6, 6, 0, 0]} name="Grammar Errors" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-neutral-500 mt-3 text-center">
            You've reduced grammar errors by <strong className="text-success-default">72%</strong> - excellent work!
          </p>
        </Card>

        {/* Vocabulary Growth */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">Vocabulary Complexity Growth</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vocabularyGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" />
              <XAxis dataKey="essay" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="level" 
                stroke="#F59E0B" 
                strokeWidth={3} 
                dot={{ fill: '#F59E0B', r: 5 }}
                name="Complexity Level"
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-sm text-neutral-500 mt-3 text-center">
            Your vocabulary complexity has grown from <strong>6.2</strong> to <strong>8.2</strong> out of 10!
          </p>
        </Card>
      </div>

      {/* Strengths & Weaknesses */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Strengths & Weaknesses Overview</h2>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={strengthsWeaknessesData}>
            <PolarGrid stroke="#E0F2FE" />
            <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar name="Current Performance" dataKey="current" stroke="#0791B2" fill="#0791B2" fillOpacity={0.6} />
            <Radar name="Target Goal" dataKey="target" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      {/* AI-Generated Improvement Suggestions */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-support/5 border-primary/20">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl text-neutral-900 mb-1">AI-Generated Improvement Suggestions</h2>
            <p className="text-sm text-neutral-500">Personalized recommendations based on your writing patterns</p>
          </div>
        </div>
        <div className="space-y-3">
          {suggestions.map((suggestion, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-rd border border-neutral-200">
              <Badge className="bg-primary text-white flex-shrink-0">{idx + 1}</Badge>
              <p className="text-sm text-neutral-700">{suggestion}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Milestones */}
      <Card className="p-6 bg-gradient-to-br from-success-default/5 to-info-default/5 border-success-default/20">
        <h2 className="text-xl text-neutral-900 mb-4">🎯 Milestones Achieved</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-rd border border-success-default/30">
            <div className="text-3xl mb-2">🏆</div>
            <h3 className="text-neutral-900 mb-1">First Essay</h3>
            <p className="text-sm text-neutral-500">Submitted your first essay</p>
          </div>
          <div className="p-4 bg-white rounded-rd border border-success-default/30">
            <div className="text-3xl mb-2">📈</div>
            <h3 className="text-neutral-900 mb-1">Improving Writer</h3>
            <p className="text-sm text-neutral-500">10+ point improvement</p>
          </div>
          <div className="p-4 bg-white rounded-rd border border-success-default/30">
            <div className="text-3xl mb-2">⭐</div>
            <h3 className="text-neutral-900 mb-1">Grammar Master</h3>
            <p className="text-sm text-neutral-500">90+ grammar score</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
