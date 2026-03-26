import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { FileText, CheckCircle, Award, Clock, Upload, MessageSquare, Loader2 } from 'lucide-react';

export function StudentDashboardTab() {
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
          .order('submitted_at', { ascending: false });

        if (error) throw error;
        setEssays(data || []);
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
        <p className="text-neutral-500">Loading your dashboard...</p>
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

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-support/10 border-primary/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl text-neutral-900 mb-2">Keep up the great work! 🎓</h2>
            <p className="text-neutral-600">
              {submittedCount > 0 
                ? `You have submitted ${submittedCount} essay${submittedCount > 1 ? 's' : ''} so far. Ready for the next one?` 
                : "Welcome to EduCompose! Ready to submit your first essay and get AI feedback?"}
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary-300 pointer-events-none">
            <Upload className="w-4 h-4 mr-2" />
            Submit New Essay
          </Button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">{stat.label}</p>
                  <p className="text-2xl text-neutral-900">{stat.value}</p>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl text-neutral-900">Performance Snapshot</h2>
          <Badge className="bg-primary/10 text-primary">AI-Powered</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {performanceMetrics.map((metric, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">{metric.label}</span>
                <span className={`${metric.color}`}>{metric.value}</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div 
                  className={`${metric.bgColor} h-2 rounded-full transition-all`}
                  style={{ width: metric.value }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {essays.length > 0 ? (
              essays.slice(0, 3).map((essay, idx) => (
                <div key={essay.id || idx} className={`p-4 rounded-rd border ${essay.status === 'analyzed' || essay.status === 'reviewed' ? 'bg-success-default/5 border-success-default/20' : 'bg-neutral-50 border-neutral-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-rd flex items-center justify-center flex-shrink-0 ${essay.status === 'analyzed' || essay.status === 'reviewed' ? 'bg-success-default/10 text-success-default' : 'bg-info-default/10 text-info-default'}`}>
                      {essay.status === 'analyzed' || essay.status === 'reviewed' ? <MessageSquare className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-neutral-900">{(essay.essay_activities as any)?.title || essay.title || "Untitled"}</h3>
                        {essay.overall_score && <Badge className="bg-success-default text-white">{essay.overall_score}%</Badge>}
                      </div>
                      <p className="text-sm text-neutral-500">
                        {new Date(essay.submitted_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-neutral-600 mt-2">
                        {essay.status === 'analyzed' || essay.status === 'reviewed' ? 'Feedback available!' : 'Currently under evaluation'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-neutral-500 text-sm">No recent activity.</p>
            )}
          </div>
        </Card>

        {/* Quick Actions & Tips */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-xl text-neutral-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button className="w-full justify-start bg-primary hover:bg-primary-300">
                <Upload className="w-4 h-4 mr-2" />
                Submit New Essay
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                View All My Essays
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Check AI Feedback
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Award className="w-4 h-4 mr-2" />
                View Progress Report
              </Button>
            </div>
          </Card>

          {/* AI Tips */}
          <Card className="p-6 bg-gradient-to-br from-support/5 to-primary/5 border-support/20">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="text-neutral-900 mb-1">Writing Tip of the Day</h3>
                <p className="text-sm text-neutral-600">
                  To improve coherence, use transition words like "however," "furthermore," and "consequently" to connect your ideas smoothly.
                </p>
              </div>
            </div>
          </Card>

          {/* Improvement Highlight */}
          <Card className="p-6 bg-gradient-to-br from-success-default/5 to-info-default/5 border-success-default/20">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌟</span>
              <div>
                <h3 className="text-neutral-900 mb-1">Your Progress</h3>
                <p className="text-sm text-neutral-600">
                  {evaluatedEssays.length > 0
                    ? `You've had ${evaluatedEssays.length} essay${evaluatedEssays.length > 1 ? 's' : ''} fully evaluated. Keep reviewing your feedback to improve!`
                    : "Submit your first essay to start seeing detailed analysis and strengths."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
