import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  TrendingUp,
  Loader2,
  Target,
  BookOpen,
  Zap,
  CheckCircle2,
  Award,
  BarChart2,
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
import { motion } from 'framer-motion';

export function ProgressTab() {
  const [essays, setEssays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEssays() {
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user) return;

        const { data: student } = await supabase
          .from('users')
          .select('id')
          .eq('id', authUser.user.id)
          .eq('role', 'student')
          .maybeSingle();

        if (!student) return;

        const { data: essaysData, error } = await supabase
          .from('essays')
          .select(
            'id, title, submitted_at, status, essay_activities(title)'
          )
          .eq('student_id', student.id)
          .order('submitted_at', { ascending: true });

        if (error) throw error;

        // Fetch analysis results for analyzed essays
        const analyzedEssayIds = (essaysData || []).filter(e => e.status === 'analyzed' || e.status === 'reviewed').map(e => e.id);
        const analysisMap = new Map();
        if (analyzedEssayIds.length > 0) {
          const { data: analysisRows } = await supabase
            .from('essay_analysis_results')
            .select('essay_id, overall_score, grammar_score, coherence_score, readability_score, argument_strength_score')
            .in('essay_id', analyzedEssayIds);
          
          (analysisRows || []).forEach(r => analysisMap.set(String(r.essay_id), r));
        }

        setEssays((essaysData || []).map(e => {
          const analysis = analysisMap.get(String(e.id));
          return {
            ...e,
            overall_score: analysis?.overall_score ?? null,
            grammar_score: analysis?.grammar_score ?? null,
            coherence_score: analysis?.coherence_score ?? null,
            readability_score: analysis?.readability_score ?? null,
            argument_strength_score: analysis?.argument_strength_score ?? null,
          };
        }));
      } catch (error) {
        console.error('Error fetching essays for progress:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchEssays();
  }, []);

  const evaluatedEssays = useMemo(() => essays.filter((e) => e.overall_score), [essays]);
  const hasNoProgress = evaluatedEssays.length === 0;

  const scoresTrendData = useMemo(() => evaluatedEssays.map((e, idx) => ({
    essay: `Work ${idx + 1}`,
    score: e.overall_score,
    date: new Date(e.submitted_at).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    }),
  })), [evaluatedEssays]);

  const grammarErrorsData = useMemo(() => evaluatedEssays.map((e, idx) => ({
    essay: `Work ${idx + 1}`,
    errors: Math.max(0, Math.round(100 - (e.grammar_score || 0)) / 2),
  })), [evaluatedEssays]);

  const vocabularyGrowthData = useMemo(() => evaluatedEssays.map((e, idx) => ({
    essay: `Work ${idx + 1}`,
    level: Math.round(((e.readability_score || 0) / 10) * 10) / 10,
  })), [evaluatedEssays]);

  const averages = useMemo(() => {
    if (evaluatedEssays.length === 0) return { grammar: 0, coherence: 0, vocab: 0, args: 0 };
    const len = evaluatedEssays.length;
    return {
      grammar: Math.round(evaluatedEssays.reduce((s, e) => s + (e.grammar_score || 0), 0) / len),
      coherence: Math.round(evaluatedEssays.reduce((s, e) => s + (e.coherence_score || 0), 0) / len),
      vocab: Math.round(evaluatedEssays.reduce((s, e) => s + (e.readability_score || 0), 0) / len),
      args: Math.round(evaluatedEssays.reduce((s, e) => s + (e.argument_strength_score || 0), 0) / len),
    };
  }, [evaluatedEssays]);

  const strengthsWeaknessesData = useMemo(() => [
    { criterion: 'Grammar', current: averages.grammar, target: 95 },
    { criterion: 'Smoothness', current: averages.coherence, target: 90 },
    { criterion: 'Words', current: averages.vocab, target: 90 },
    { criterion: 'Structure', current: Math.max(0, averages.coherence - 2), target: 88 },
    { criterion: 'Ideas', current: averages.args, target: 90 },
    { criterion: 'Being Unique', current: 95, target: 95 },
  ], [averages]);

  const overallDelta = useMemo(() => {
    if (evaluatedEssays.length < 2) return null;
    const first = evaluatedEssays[0];
    const last = evaluatedEssays[evaluatedEssays.length - 1];
    return Math.round((last.overall_score || 0) - (first.overall_score || 0));
  }, [evaluatedEssays]);

  const isImproving = overallDelta !== null && overallDelta > 0;

  const statCards = [
    { label: 'Grammar', value: `${averages.grammar}%`, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Word Choice', value: `${averages.vocab}%`, icon: <BookOpen className="w-5 h-5" />, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Smoothness', value: `${averages.coherence}%`, icon: <Zap className="w-5 h-5" />, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Strong Ideas', value: `${averages.args}%`, icon: <Target className="w-5 h-5" />, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  const suggestions = [
    { icon: <Target className="w-4 h-4 text-primary" />, text: 'Try to use more examples to explain your ideas clearly.' },
    { icon: <TrendingUp className="w-4 h-4 text-info-default" />, text: 'Use connecting words like "so" or "because" to make your story flow better.' },
    { icon: <BookOpen className="w-4 h-4 text-warning-default" />, text: 'You are using many great words! Keep learning new ones.' },
    { icon: <CheckCircle2 className="w-4 h-4 text-success-default" />, text: 'Your grammar is very good. Keep double-checking your work!' },
  ];

  const milestones = [
    { icon: <FileText className="w-5 h-5 text-blue-500" />, iconBg: 'bg-blue-50', title: 'First Step', description: 'You finished your first essay!', achieved: evaluatedEssays.length >= 1 },
    { icon: <TrendingUp className="w-5 h-5 text-emerald-500" />, iconBg: 'bg-emerald-50', title: 'Getting Better', description: 'Your score went up by 10 points!', achieved: evaluatedEssays.length >= 2 && overallDelta! >= 10 },
    { icon: <Award className="w-5 h-5 text-amber-500" />, iconBg: 'bg-amber-50', title: 'Grammar Hero', description: 'You got 90% or more in Grammar!', achieved: averages.grammar >= 90 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-neutral-100 rounded-xl shadow-xl p-3">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
               <p className="text-sm font-bold text-neutral-800">{p.value}%</p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Checking your progress...</p>
      </div>
    );
  }

  if (hasNoProgress) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-20 h-20 bg-neutral-100 rounded-3xl flex items-center justify-center mb-6">
          <BarChart2 className="w-10 h-10 text-neutral-300" />
        </div>
        <h2 className="text-xl font-bold text-neutral-800 mb-2">Nothing to see yet</h2>
        <p className="text-sm font-medium text-neutral-400 text-center max-w-sm leading-relaxed px-4">
          Once your teacher grades your essays, you will see your scores and progress here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 px-1">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">How You're Doing</h1>
          <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp size={14} className="text-primary/50" />
            Track your writing journey
          </p>
        </div>
        {overallDelta !== null && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-[11px] font-bold uppercase tracking-wider ${
            isImproving ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-neutral-50 border-neutral-100 text-neutral-500'
          }`}>
            {isImproving ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isImproving ? 'You are improving!' : 'Keep practicing!'}
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white rounded-3xl border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group"
          >
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4 group-hover:scale-110 transition-transform`}>
              {stat.icon}
            </div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{stat.label}</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-3xl font-bold text-neutral-900 tracking-tight">{stat.value}</p>
              <p className="text-[11px] font-bold text-neutral-300 uppercase mb-1.5">Average</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Score Trend Chart */}
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-neutral-50 bg-neutral-50/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Your Score History</h2>
            <p className="text-xs text-neutral-500 font-medium italic">See how your scores change with every essay</p>
          </div>
          {overallDelta !== null && (
             <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${isImproving ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-50 text-neutral-500'}`}>
                {overallDelta >= 0 ? `+${overallDelta}` : overallDelta} Points Total
             </span>
          )}
        </div>
        <div className="p-6">
           <div className="h-[300px] w-full relative" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <LineChart data={scoresTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="essay" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="score" stroke="#0791B2" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Grammar & Vocab side by side */}
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden p-6 space-y-6">
           <div>
              <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Clean Writing</h2>
              <p className="text-xs text-neutral-500 font-medium mb-4">You want this bar to go down (less mistakes!)</p>
              <div className="h-[200px] w-full mt-4">
                  <ResponsiveContainer width="100%" height={300} minWidth={0}>
                    <BarChart data={grammarErrorsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="essay" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="errors" fill="#10B981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
              </div>
           </div>
        </div>

        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden p-6 space-y-6">
           <div>
              <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Word Power</h2>
              <p className="text-xs text-neutral-500 font-medium mb-4">How complex and varied your words are</p>
              <div className="h-[200px] w-full mt-4">
                  <ResponsiveContainer width="100%" height={300} minWidth={0}>
                    <LineChart data={vocabularyGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="essay" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                      <YAxis hide domain={[0, 10]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="level" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                    </LineChart>
                  </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>

      {/* Skills Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-neutral-50 bg-neutral-50/20">
              <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">What You're Good At</h2>
              <p className="text-xs text-neutral-500 font-medium mt-1">Your skills compared to our goal</p>
            </div>
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={strengthsWeaknessesData}>
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                    <PolarRadiusAxis axisLine={false} tick={false} domain={[0, 100]} />
                    <Radar name="Current" dataKey="current" stroke="#0791B2" fill="#0791B2" fillOpacity={0.6} />
                    <Radar name="Goal" dataKey="target" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
                  </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="space-y-8">
           {/* Tips */}
           <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-neutral-50 bg-neutral-50/20">
                <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Helpful Tips</h2>
              </div>
              <div className="p-4 space-y-3">
                 {suggestions.map((item, idx) => (
                   <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-neutral-50/50 border border-neutral-50 group hover:border-primary/20 transition-all">
                      <div className="mt-0.5 shrink-0 group-hover:scale-110 transition-transform">{item.icon}</div>
                      <p className="text-xs text-neutral-600 leading-relaxed font-medium">{item.text}</p>
                   </div>
                 ))}
              </div>
           </div>

           {/* Awards */}
           <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-neutral-50 bg-neutral-50/20">
                <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Your Awards</h2>
              </div>
              <div className="p-4 space-y-2">
                 {milestones.map((m, idx) => (
                   <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${m.achieved ? 'bg-white border-neutral-100 shadow-sm' : 'bg-neutral-50 border-transparent opacity-40'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.achieved ? m.iconBg : 'bg-neutral-200'}`}>
                         {m.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                         <p className="text-sm font-bold text-neutral-800 tracking-tight">{m.title}</p>
                         <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight">{m.description}</p>
                      </div>
                      {m.achieved && <CheckCircle2 size={16} className="text-emerald-500" />}
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
