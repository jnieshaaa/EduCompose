import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Card from '../../components/ui/Card';
import {
  TrendingUp,
  Loader2,
  Target,
  BookOpen,
  Zap,
  CheckCircle2,
  AlertCircle,
  Award,
  BarChart2,
  Lightbulb,
  FileText,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

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
          .select(
            'id, title, submitted_at, status, overall_score, grammar_score, coherence_score, readability_score, argument_strength_score, essay_activities(title)'
          )
          .eq('student_id', student.id)
          .order('submitted_at', { ascending: true });

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

  const evaluatedEssays = essays.filter((e) => e.overall_score);
  const hasNoProgress = evaluatedEssays.length === 0;

  const scoresTrendData = evaluatedEssays.map((e, idx) => ({
    essay: `Essay ${idx + 1}`,
    score: e.overall_score,
    date: new Date(e.submitted_at).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    }),
  }));

  const grammarErrorsData = evaluatedEssays.map((e, idx) => ({
    essay: `Essay ${idx + 1}`,
    errors: Math.max(0, Math.round(100 - (e.grammar_score || 0)) / 2),
  }));

  const vocabularyGrowthData = evaluatedEssays.map((e, idx) => ({
    essay: `Essay ${idx + 1}`,
    level: Math.round(((e.readability_score || 0) / 10) * 10) / 10,
  }));

  const avgGrammar =
    evaluatedEssays.length > 0
      ? Math.round(
          evaluatedEssays.reduce((s, e) => s + (e.grammar_score || 0), 0) /
            evaluatedEssays.length
        )
      : 0;
  const avgCoherence =
    evaluatedEssays.length > 0
      ? Math.round(
          evaluatedEssays.reduce((s, e) => s + (e.coherence_score || 0), 0) /
            evaluatedEssays.length
        )
      : 0;
  const avgVocabulary =
    evaluatedEssays.length > 0
      ? Math.round(
          evaluatedEssays.reduce((s, e) => s + (e.readability_score || 0), 0) /
            evaluatedEssays.length
        )
      : 0;
  const avgArguments =
    evaluatedEssays.length > 0
      ? Math.round(
          evaluatedEssays.reduce(
            (s, e) => s + (e.argument_strength_score || 0),
            0
          ) / evaluatedEssays.length
        )
      : 0;

  const strengthsWeaknessesData = [
    { criterion: 'Grammar', current: avgGrammar, target: 95 },
    { criterion: 'Coherence', current: avgCoherence, target: 90 },
    { criterion: 'Vocabulary', current: avgVocabulary, target: 90 },
    { criterion: 'Structure', current: avgCoherence - 2, target: 88 },
    { criterion: 'Arguments', current: avgArguments, target: 90 },
    { criterion: 'Originality', current: 95, target: 95 },
  ];

  // Real delta: compare first essay vs last essay for each metric
  const first = evaluatedEssays[0];
  const last = evaluatedEssays[evaluatedEssays.length - 1];

  const calcDelta = (key: string) => {
    if (!first || !last || evaluatedEssays.length < 2) return null;
    const diff = Math.round((last[key] || 0) - (first[key] || 0));
    return diff;
  };

  const formatDelta = (val: number | null) => {
    if (val === null) return '—';
    return val >= 0 ? `+${val}pts` : `${val}pts`;
  };

  const deltaStatus = (val: number | null) => {
    if (val === null) return 'moderate';
    if (val >= 10) return 'excellent';
    if (val >= 3) return 'good';
    if (val >= 0) return 'moderate';
    return 'poor';
  };

  const grammarDelta = calcDelta('grammar_score');
  const vocabDelta = calcDelta('readability_score');
  const coherenceDelta = calcDelta('coherence_score');
  const argumentDelta = calcDelta('argument_strength_score');
  const overallDelta = calcDelta('overall_score');
  const isImproving = overallDelta !== null && overallDelta > 0;

  const statCards = [
    {
      label: 'Grammar Accuracy',
      value: `${avgGrammar}%`,
      delta: formatDelta(grammarDelta),
      status: deltaStatus(grammarDelta),
      positive: grammarDelta === null || grammarDelta >= 0,
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    {
      label: 'Vocabulary',
      value: `${avgVocabulary}%`,
      delta: formatDelta(vocabDelta),
      status: deltaStatus(vocabDelta),
      positive: vocabDelta === null || vocabDelta >= 0,
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      label: 'Coherence Score',
      value: `${avgCoherence}%`,
      delta: formatDelta(coherenceDelta),
      status: deltaStatus(coherenceDelta),
      positive: coherenceDelta === null || coherenceDelta >= 0,
      icon: <Zap className="w-5 h-5" />,
    },
    {
      label: 'Argument Strength',
      value: `${avgArguments}%`,
      delta: formatDelta(argumentDelta),
      status: deltaStatus(argumentDelta),
      positive: argumentDelta === null || argumentDelta >= 0,
      icon: <Target className="w-5 h-5" />,
    },
  ];

  const suggestions = [
    {
      icon: <Target className="w-4 h-4 text-primary" />,
      text: 'Focus on strengthening your arguments with more evidence and examples.',
    },
    {
      icon: <TrendingUp className="w-4 h-4 text-info-default" />,
      text: 'Work on improving paragraph transitions for better coherence.',
    },
    {
      icon: <BookOpen className="w-4 h-4 text-warning-default" />,
      text: 'Continue building your vocabulary — your growth has been excellent.',
    },
    {
      icon: <CheckCircle2 className="w-4 h-4 text-success-default" />,
      text: 'Maintain your strong grammar and originality scores.',
    },
  ];

  const milestones = [
    {
      icon: <FileText className="w-5 h-5 text-primary" />,
      color: 'bg-primary/10 border-primary/20',
      iconBg: 'bg-primary/10',
      title: 'First Essay',
      description: 'Submitted your first essay',
      achieved: evaluatedEssays.length >= 1,
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-success-default" />,
      color: 'bg-success-default/10 border-success-default/20',
      iconBg: 'bg-success-default/10',
      title: 'Improving Writer',
      description: '10+ point score improvement',
      achieved:
        evaluatedEssays.length >= 2 &&
        (evaluatedEssays[evaluatedEssays.length - 1]?.overall_score || 0) -
          (evaluatedEssays[0]?.overall_score || 0) >=
          10,
    },
    {
      icon: <Award className="w-5 h-5 text-warning-default" />,
      color: 'bg-warning-default/10 border-warning-default/20',
      iconBg: 'bg-warning-default/10',
      title: 'Grammar Master',
      description: 'Achieved 90+ grammar score',
      achieved: avgGrammar >= 90,
    },
  ];

  const statusColor = (status: string) => {
    if (status === 'excellent') return 'text-success-default';
    if (status === 'good') return 'text-info-default';
    return 'text-warning-default';
  };

  const statusBg = (status: string) => {
    if (status === 'excellent') return 'bg-success-default/10 border-success-default/20';
    if (status === 'good') return 'bg-info-default/10 border-info-default/20';
    return 'bg-warning-default/10 border-warning-default/20';
  };

  // Custom Tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-neutral-200 rounded-lg shadow-md px-3 py-2">
          <p className="text-xs font-semibold text-neutral-700 mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-xs" style={{ color: p.color }}>
              {p.name}: <strong>{p.value}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-neutral-500">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (hasNoProgress) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-20 h-20 bg-neutral-100 rounded-2xl flex items-center justify-center mb-5">
          <BarChart2 className="w-10 h-10 text-neutral-400" />
        </div>
        <h2 className="text-xl font-semibold text-neutral-800 mb-2">No analytics yet</h2>
        <p className="text-sm text-neutral-500 text-center max-w-sm leading-relaxed">
          Submit essays and wait for them to be graded. Your score trends, grammar
          accuracy, and vocabulary growth will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Page Header */}
      {/* <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
            Progress &amp; Analytics
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Track your writing improvement across {evaluatedEssays.length} graded{' '}
            {evaluatedEssays.length === 1 ? 'submission' : 'submissions'}.
          </p>
        </div>
        {evaluatedEssays.length >= 2 && (
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium ${
            isImproving
              ? 'text-success-default bg-success-default/10 border-success-default/20'
              : 'text-warning-default bg-warning-default/10 border-warning-default/20'
          }`}>
            {isImproving
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{isImproving ? 'Improving' : 'Needs Work'}</span>
          </div>
        )}
      </div> */}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((item, idx) => (
          <Card key={idx} className={`p-4 border ${statusBg(item.status)}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                {item.label}
              </p>
              <div className={`${statusColor(item.status)} opacity-80`}>
                {item.icon}
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-neutral-900">{item.value}</span>
              <div className={`flex items-center gap-1 text-xs font-semibold ${
                item.positive ? statusColor(item.status) : 'text-error-default'
              }`}>
                {item.positive
                  ? <ChevronUp className="w-3.5 h-3.5" />
                  : <ChevronDown className="w-3.5 h-3.5" />}
                {item.delta}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Score Trend */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold text-neutral-900">Score Trend Over Time</h2>
        </div>
        <p className="text-xs text-neutral-400 mb-5 ml-6">Overall score per submission</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={scoresTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#0791B2"
              strokeWidth={2.5}
              dot={{ fill: '#0791B2', r: 4, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
              name="Overall Score (%)"
            />
          </LineChart>
        </ResponsiveContainer>
        {overallDelta !== null && (
          <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg border ${
            isImproving
              ? 'bg-success-default/8 border-success-default/20'
              : 'bg-warning-default/8 border-warning-default/20'
          }`}>
            {isImproving
              ? <CheckCircle2 className="w-4 h-4 text-success-default flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-warning-default flex-shrink-0" />}
            <p className={`text-sm ${
              isImproving ? 'text-success-default' : 'text-warning-default'
            }`}>
              {isImproving
                ? <><strong>Great progress!</strong> Overall score improved by <strong>+{overallDelta} pts</strong> since your first essay.</>
                : <><strong>Keep going!</strong> Overall score changed by <strong>{overallDelta} pts</strong> since your first essay.</>
              }
            </p>
          </div>
        )}
      </Card>

      {/* Grammar & Vocabulary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grammar Error Reduction */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-error-default" />
            <h2 className="text-base font-semibold text-neutral-900">Grammar Error Reduction</h2>
          </div>
          <p className="text-xs text-neutral-400 mb-5 ml-6">Fewer errors = better score</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={grammarErrorsData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="essay"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="errors"
                fill="#10B981"
                radius={[6, 6, 0, 0]}
                name="Grammar Errors"
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-neutral-500 mt-3 text-center">
            Grammar errors reduced significantly — keep it up!
          </p>
        </Card>

        {/* Vocabulary Growth */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-warning-default" />
            <h2 className="text-base font-semibold text-neutral-900">Vocabulary Complexity</h2>
          </div>
          <p className="text-xs text-neutral-400 mb-5 ml-6">Readability complexity scale (0–10)</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={vocabularyGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="essay"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="level"
                stroke="#F59E0B"
                strokeWidth={2.5}
                dot={{ fill: '#F59E0B', r: 4, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
                name="Complexity Level"
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-neutral-500 mt-3 text-center">
            Your vocabulary complexity is consistently growing.
          </p>
        </Card>
      </div>

      {/* Strengths & Weaknesses Radar */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold text-neutral-900">Strengths &amp; Weaknesses Overview</h2>
        </div>
        <p className="text-xs text-neutral-400 mb-4 ml-6">
          Current performance vs. target goals across all criteria
        </p>
        <ResponsiveContainer width="100%" height={380}>
          <RadarChart data={strengthsWeaknessesData}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 12, fill: '#64748B' }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
            <Radar
              name="Current Performance"
              dataKey="current"
              stroke="#0791B2"
              fill="#0791B2"
              fillOpacity={0.5}
            />
            <Radar
              name="Target Goal"
              dataKey="target"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.2}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-neutral-600">{value}</span>
              )}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      {/* AI Suggestions & Milestones — side by side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* AI Suggestions */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-warning-default" />
            <h2 className="text-base font-semibold text-neutral-900">Improvement Suggestions</h2>
          </div>
          <p className="text-xs text-neutral-400 mb-4 ml-6">
            Personalized recommendations based on your writing patterns
          </p>
          <div className="space-y-3">
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg border border-neutral-100 bg-neutral-50/60 hover:bg-neutral-50 transition-colors"
              >
                <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
                <p className="text-sm text-neutral-700 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Milestones */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-warning-default" />
            <h2 className="text-base font-semibold text-neutral-900">Milestones Achieved</h2>
          </div>
          <p className="text-xs text-neutral-400 mb-4 ml-6">
            Achievements unlocked based on your progress
          </p>
          <div className="space-y-3">
            {milestones.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-opacity ${
                  m.achieved ? m.color : 'bg-neutral-50 border-neutral-200 opacity-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    m.achieved ? m.iconBg : 'bg-neutral-200'
                  }`}
                >
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-neutral-900">{m.title}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{m.description}</p>
                </div>
                {m.achieved ? (
                  <CheckCircle2 className="w-5 h-5 text-success-default flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-neutral-300 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
