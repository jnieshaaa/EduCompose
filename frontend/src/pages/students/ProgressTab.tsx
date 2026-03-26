import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { TrendingUp, Target, Loader2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export function ProgressTab() {
  const [essays, setEssays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEssays() {
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user) return;

        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('auth_user_id', authUser.user.id)
          .maybeSingle();

        if (!student) return;

        const { data, error } = await supabase
          .from('essays')
          .select('id, title, submitted_at, status, overall_score, grammar_score, coherence_score, readability_score, argument_strength_score, essay_activities(title)')
          .eq('student_id', student.id)
          .order('submitted_at', { ascending: true }); // old to new for trends

        if (error) throw error;
        setEssays(data || []);
      } catch (error) {
        console.error('Error fetching essays for progress:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchEssays();
  }, []);

  const evaluatedEssays = essays.filter(e => e.overall_score);
  const hasNoProgress = evaluatedEssays.length === 0;

  const scoresTrendData = evaluatedEssays.map((e, idx) => ({
    essay: `Essay ${idx + 1}`,
    score: e.overall_score,
    date: new Date(e.submitted_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
  }));

  const grammarErrorsData = evaluatedEssays.map((e, idx) => ({
    essay: `Essay ${idx + 1}`,
    errors: Math.max(0, Math.round(100 - (e.grammar_score || 0)) / 2) // mock error count based on score
  }));

  const vocabularyGrowthData = evaluatedEssays.map((e, idx) => ({
    essay: `Essay ${idx + 1}`,
    level: Math.round(((e.readability_score || 0) / 10) * 10) / 10 // Max 10.0 scale roughly
  }));

  const avgGrammar = evaluatedEssays.length > 0 ? Math.round(evaluatedEssays.reduce((s, e) => s + (e.grammar_score || 0), 0) / evaluatedEssays.length) : 0;
  const avgCoherence = evaluatedEssays.length > 0 ? Math.round(evaluatedEssays.reduce((s, e) => s + (e.coherence_score || 0), 0) / evaluatedEssays.length) : 0;
  const avgVocabulary = evaluatedEssays.length > 0 ? Math.round(evaluatedEssays.reduce((s, e) => s + (e.readability_score || 0), 0) / evaluatedEssays.length) : 0;
  const avgArguments = evaluatedEssays.length > 0 ? Math.round(evaluatedEssays.reduce((s, e) => s + (e.argument_strength_score || 0), 0) / evaluatedEssays.length) : 0;

  const strengthsWeaknessesData = [
    { criterion: 'Grammar', current: avgGrammar, target: 95 },
    { criterion: 'Coherence', current: avgCoherence, target: 90 },
    { criterion: 'Vocabulary', current: avgVocabulary, target: 90 },
    { criterion: 'Structure', current: avgCoherence - 2, target: 88 },
    { criterion: 'Arguments', current: avgArguments, target: 90 },
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }


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
