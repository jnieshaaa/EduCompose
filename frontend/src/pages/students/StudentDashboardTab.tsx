import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
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
  BarChart2,
} from 'lucide-react';
import { buildSecureUrl } from '../../utils/secureUrl';
import Button from '../../components/ui/Button';

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

  if (loading) {
    return (
      <div className="flex justify-center flex-col items-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-neutral-500 text-sm">Loading your dashboard...</p>
      </div>
    );
  }

  const submittedCount = essays.length;
  const evaluatedCount = essays.filter(e => e.status === 'analyzed' || e.status === 'reviewed').length;
  const pendingCount = essays.filter(e => e.status !== 'analyzed' && e.status !== 'reviewed').length;

  const evaluatedEssays = essays.filter(e => e.overall_score);
  const avgScore = evaluatedEssays.length > 0
    ? Math.round(evaluatedEssays.reduce((s, e) => s + (e.overall_score || 0), 0) / evaluatedEssays.length) + '%'
    : 'N/A';

  const statsCards = [
    { label: 'Essays Submitted', value: submittedCount.toString(), icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Essays Evaluated', value: evaluatedCount.toString(), icon: CheckCircle, color: 'text-success-default', bg: 'bg-success-default/10' },
    { label: 'Average Score', value: avgScore, icon: Award, color: 'text-info-default', bg: 'bg-info-default/10' },
    { label: 'Pending Reviews', value: pendingCount.toString(), icon: Clock, color: 'text-warning-default', bg: 'bg-warning-default/10' },
  ];

  const avgGrammar = evaluatedEssays.length > 0 ? Math.round(evaluatedEssays.reduce((s, e) => s + (e.grammar_score || 0), 0) / evaluatedEssays.length) + '%' : 'N/A';
  const avgCoherence = evaluatedEssays.length > 0 ? Math.round(evaluatedEssays.reduce((s, e) => s + (e.coherence_score || 0), 0) / evaluatedEssays.length) + '%' : 'N/A';
  const avgVocabulary = evaluatedEssays.length > 0 ? Math.round(evaluatedEssays.reduce((s, e) => s + (e.readability_score || 0), 0) / evaluatedEssays.length) + '%' : 'N/A';
  const avgArguments = evaluatedEssays.length > 0 ? Math.round(evaluatedEssays.reduce((s, e) => s + (e.argument_strength_score || 0), 0) / evaluatedEssays.length) + '%' : 'N/A';

  const performanceMetrics = [
    { label: 'Grammar Accuracy', value: avgGrammar, color: 'text-success-default', bgColor: 'bg-success-default' },
    { label: 'Coherence Score', value: avgCoherence, color: 'text-info-default', bgColor: 'bg-info-default' },
    { label: 'Readability', value: avgVocabulary, color: 'text-primary', bgColor: 'bg-primary' },
    { label: 'Argument Strength', value: avgArguments, color: 'text-success-default', bgColor: 'bg-success-default' },
  ];

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

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
                </div>
                <div className={`${stat.bg} ${stat.color} p-2 rounded-rd`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Performance Snapshot */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold text-neutral-900">Performance Snapshot</h2>
          <Badge className="ml-auto bg-primary/50 text-primary text-xs">AI-Powered</Badge>
        </div>
        <p className="text-xs text-neutral-400 mb-5 ml-6">Average scores across all evaluated essays</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {performanceMetrics.map((metric, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">{metric.label}</span>
                <span className={`text-sm font-semibold ${metric.color}`}>{metric.value}</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-1.5">
                <div
                  className={`${metric.bgColor} h-1.5 rounded-full transition-all`}
                  style={{ width: metric.value === 'N/A' ? '0%' : metric.value }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-neutral-900">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {essays.length > 0 ? (
              essays.slice(0, 3).map((essay, idx) => {
                const isEvaluated = essay.status === 'analyzed' || essay.status === 'reviewed';
                const activityTitle = essay.activityTitle || essay.title || 'Untitled';

                return (
                  <div
                    key={essay.id || idx}
                    onClick={() => handleEssayClick(essay)}
                    className={`
                      p-3.5 rounded-lg border flex items-center gap-3 transition-all
                      ${isEvaluated
                        ? 'bg-success-default/5 border-success-default/20 cursor-pointer hover:bg-success-default/10 hover:border-success-default/40 hover:shadow-sm'
                        : 'bg-neutral-50 border-neutral-200 cursor-default opacity-80'
                      }
                    `}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isEvaluated ? 'bg-success-default/10 text-success-default' : 'bg-neutral-200 text-neutral-400'}`}>
                      {isEvaluated ? <MessageSquare className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-neutral-900 truncate">{activityTitle}</h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {new Date(essay.submitted_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        <span className={isEvaluated ? 'text-success-default' : 'text-neutral-400'}>
                          {isEvaluated ? 'Result available' : 'Pending review'}
                        </span>
                      </p>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {essay.overall_score && (
                        <Badge className="bg-success-default text-white text-xs">{essay.overall_score}%</Badge>
                      )}
                      {isEvaluated && (
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <FileText className="w-8 h-8 text-neutral-300 mb-2" />
                <p className="text-sm text-neutral-500">No recent activity yet.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-neutral-900">Quick Actions</h2>
            </div>
            <div className="space-y-2.5">
              <Button 
                variant="outline" 
                className="w-full justify-start text-sm hover:bg-primary/5 hover:text-primary transition-colors"
                onClick={() => navigate('/Student/Essays')}
              >
                <FileText className="w-4 h-4 mr-2" />
                View All My Essays
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-sm hover:bg-primary/5 hover:text-primary transition-colors"
                onClick={() => navigate('/Student/Progress')}
              >
                <Award className="w-4 h-4 mr-2" />
                View Progress Report
              </Button>
            </div>
          </Card>

          {/* Writing Tip */}
          <Card className="p-5 bg-gradient-to-br from-support/5 to-primary/5 border-support/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning-default/10 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4 h-4 text-warning-default" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-1">Writing Tip of the Day</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  To improve coherence, use transition words like "however," "furthermore," and "consequently" to connect your ideas smoothly.
                </p>
              </div>
            </div>
          </Card>

          {/* Your Progress */}
          <Card className="p-5 bg-gradient-to-br from-success-default/5 to-info-default/5 border-success-default/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-success-default/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-success-default" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-1">Your Progress</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {evaluatedEssays.length > 0
                    ? `You've had ${evaluatedEssays.length} essay${evaluatedEssays.length > 1 ? 's' : ''} fully evaluated. Keep reviewing your feedback to improve!`
                    : 'Submit your first essay to start seeing detailed analysis and strengths.'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
