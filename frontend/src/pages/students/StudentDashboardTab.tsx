import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  FileText,
  CheckCircle,
  Award,
  Clock,
  MessageSquare,
  Loader2,
  Lightbulb,
  TrendingUp,
  ChevronRight,
  Zap,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { buildSecureUrl } from '../../utils/secureUrl';
import { motion } from 'framer-motion';

// Format timestamp to relative time (ported from teacher dashboard for consistency)
const formatTimeAgo = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? "s" : ""} ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString();
};

export function StudentDashboardTab() {
  const [essays, setEssays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchEssays() {
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user) return;

        const { data: student } = await supabase
          .from('students')
          .select('id, student_code')
          .eq('auth_user_id', authUser.user.id)
          .maybeSingle();

        if (!student) return;

        const { data, error } = await supabase
          .from('essays')
          .select('id, title, submitted_at, status, overall_score, grammar_score, coherence_score, readability_score, argument_strength_score, essay_activities(id, title)')
          .eq('student_id', student.id)
          .order('submitted_at', { ascending: false });

        if (error) throw error;
        setEssays((data || []).map(e => ({
          ...e,
          activityId: (e.essay_activities as any)?.id,
          activityTitle: (e.essay_activities as any)?.title,
          studentCode: student.student_code,
        })));
      } catch (error) {
        console.error('Error fetching essays:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchEssays();
  }, []);

  const stats = useMemo(() => {
    const submittedCount = essays.length;
    const evaluatedCount = essays.filter(e => e.status === 'analyzed' || e.status === 'reviewed').length;
    const pendingCount = essays.filter(e => e.status === 'submitted' || e.status === 'processing').length;
    
    const evaluatedEssays = essays.filter(e => e.overall_score);
    const avgScore = evaluatedEssays.length > 0
      ? Math.round(evaluatedEssays.reduce((s, e) => s + (e.overall_score || 0), 0) / evaluatedEssays.length) + '%'
      : '0%';

    return {
      submittedCount,
      evaluatedCount,
      pendingCount,
      avgScore
    };
  }, [essays]);

  const performanceMetrics = useMemo(() => {
    const evaluatedEssays = essays.filter(e => e.overall_score);
    const getAvg = (key: string) => evaluatedEssays.length > 0 
      ? Math.round(evaluatedEssays.reduce((s, e) => s + (e[key] || 0), 0) / evaluatedEssays.length) + '%' 
      : '0%';

    return [
      { label: 'Grammar', value: getAvg('grammar_score'), icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
      { label: 'Structure', value: getAvg('coherence_score'), icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
      { label: 'Vocabulary', value: getAvg('readability_score'), icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-50' },
      { label: 'Arguments', value: getAvg('argument_strength_score'), icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
    ];
  }, [essays]);

  const handleEssayClick = (essay: any) => {
    const isEvaluated = essay.status === 'analyzed' || essay.status === 'reviewed';
    if (!isEvaluated) return;

    const activityTitle = essay.activityTitle || essay.title || 'Untitled';
    const url = buildSecureUrl('/Student/Essays/Result', {
      essayId: essay.id,
      activityId: essay.activityId,
      activityTitle,
      studentId: essay.studentCode,
      fromEssays: 'true',
    });
    navigate(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <Zap size={14} className="text-primary/50" />
            Your writing progress at a glance
          </p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => navigate('/Student/Essays')}
             className="flex items-center justify-center gap-2 bg-white border border-neutral-100 text-neutral-500 text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-sm hover:bg-neutral-50 transition-all"
           >
             Submit New Essay
             <ArrowRight size={12} />
           </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Submitted', value: stats.submittedCount, sub: 'Total Essays', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Evaluated', value: stats.evaluatedCount, sub: 'With Feedback', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Avg Score', value: stats.avgScore, sub: 'Overall performance', icon: Award, color: 'text-purple-500', bg: 'bg-purple-50' },
          { label: 'Pending', value: stats.pendingCount, sub: 'Awaiting Review', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white rounded-3xl border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group"
          >
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon size={22} />
            </div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{stat.label}</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-3xl font-bold text-neutral-900 tracking-tight">{stat.value}</p>
              <p className="text-[11px] font-bold text-neutral-300 uppercase mb-1.5">{stat.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Performance Snapshot */}
          <div className="space-y-4">
            <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2 px-1">
              <TrendingUp size={14} className="text-primary" />
              Writing Diagnostics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {performanceMetrics.map((metric, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="bg-white p-5 rounded-2xl border border-neutral-50 shadow-sm flex flex-col items-center text-center group"
                >
                  <div className={`p-2 rounded-xl ${metric.bg} ${metric.color} mb-3 group-hover:rotate-12 transition-transform`}>
                    <metric.icon size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">{metric.label}</p>
                  <p className="text-xl font-extrabold text-neutral-900">{metric.value}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent Essays Section */}
          <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-neutral-50 bg-neutral-50/20 flex items-center justify-between">
              <div>
                <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Recent Activity</h2>
                <p className="text-xs text-neutral-500 font-medium">Your latest essay submissions and evaluations</p>
              </div>
              <button 
                onClick={() => navigate('/Student/Essays')}
                className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
              >
                View All
              </button>
            </div>
            <div className="p-4 space-y-2">
              {essays.length > 0 ? (
                essays.slice(0, 5).map((essay, idx) => {
                  const isEvaluated = essay.status === 'analyzed' || essay.status === 'reviewed';
                  const activityTitle = essay.activityTitle || essay.title || 'Untitled';

                  return (
                    <motion.div
                      key={essay.id || idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * idx }}
                      onClick={() => handleEssayClick(essay)}
                      className={`
                        group p-4 rounded-2xl border border-transparent transition-all flex items-center gap-4
                        ${isEvaluated 
                          ? 'hover:bg-neutral-50 hover:border-neutral-100 cursor-pointer' 
                          : 'opacity-70 cursor-default'}
                      `}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${isEvaluated ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-400'}`}>
                        {isEvaluated ? <MessageSquare size={20} /> : <FileText size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="text-sm font-bold text-neutral-800 tracking-tight truncate">{activityTitle}</h3>
                          <span className="text-[11px] font-bold text-neutral-300 uppercase">{formatTimeAgo(essay.submitted_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${isEvaluated ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {isEvaluated ? 'Result Available' : essay.status}
                           </span>
                           {essay.overall_score && (
                             <span className="text-xs font-bold text-primary">{essay.overall_score}%</span>
                           )}
                        </div>
                      </div>
                      {isEvaluated && (
                        <ChevronRight className="w-5 h-5 text-neutral-200 group-hover:text-primary transition-colors" />
                      )}
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center py-12 text-center opacity-40">
                  <FileText className="w-12 h-12 text-neutral-300 mb-3" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 text-center">No essays found</p>
                </div>
              )}
            </div>
            {essays.length > 5 && (
              <div className="p-4 bg-neutral-50/50 border-t border-neutral-50">
                 <button 
                  onClick={() => navigate('/Student/Essays')}
                  className="w-full py-2.5 text-[11px] font-bold text-neutral-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2"
                 >
                     View all submissions <ArrowRight size={12} />
                 </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          
          {/* Quick Actions */}
          <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-neutral-50 bg-neutral-50/20">
              <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Shortcuts</h2>
            </div>
            <div className="p-4 grid grid-cols-1 gap-2">
              {[
                { label: "My Essays", sub: "View all work", icon: FileText, path: "/Student/Essays", color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Growth Report", sub: "Track progress", icon: TrendingUp, path: "/Student/Progress", color: "text-purple-500", bg: "bg-purple-50" },
                { label: "Writing Center", sub: "Tips & tricks", icon: Lightbulb, path: "#", color: "text-amber-500", bg: "bg-amber-50" },
              ].map((nav, i) => (
                <button 
                  key={i} 
                  onClick={() => nav.path !== '#' && navigate(nav.path)}
                  className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-neutral-50 transition-all group text-left border border-transparent hover:border-neutral-100"
                >
                  <div className={`w-10 h-10 rounded-xl ${nav.bg} ${nav.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                     <nav.icon size={18} />
                  </div>
                  <div className="min-w-0">
                     <p className="text-sm font-bold text-neutral-800 tracking-tight">{nav.label}</p>
                     <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">{nav.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Tip Card */}
          <div className="bg-primary/[0.02] rounded-3xl border border-primary/10 p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <h3 className="text-sm font-bold text-neutral-800 tracking-tight mb-2 flex items-center gap-2">
              <Lightbulb size={16} className="text-primary" />
              Writing Tip
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              To improve your <span className="text-primary font-bold uppercase tracking-tighter">Coherence</span> score, try using transition words like "furthermore," "nevertheless," and "consequently" to bridge your paragraphs.
            </p>
            <div className="mt-6 p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Next Goal</span>
              <span className="text-[10px] font-bold text-primary uppercase px-2.5 py-1 bg-primary/5 rounded-md italic">Advanced Vocab</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
