import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { FileText, CheckCircle, Award, Clock, Upload, Eye, MessageSquare } from 'lucide-react';

const statsCards = [
  { label: 'Essays Submitted', value: '12', icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Essays Evaluated', value: '10', icon: CheckCircle, color: 'text-success-default', bg: 'bg-success-default/10' },
  { label: 'Average Score', value: '88%', icon: Award, color: 'text-info-default', bg: 'bg-info-default/10' },
  { label: 'Pending Reviews', value: '2', icon: Clock, color: 'text-warning-default', bg: 'bg-warning-default/10' },
];

const performanceMetrics = [
  { label: 'Grammar Accuracy', value: '92%', color: 'text-success-default', bgColor: 'bg-success-default' },
  { label: 'Coherence Score', value: '85%', color: 'text-info-default', bgColor: 'bg-info-default' },
  { label: 'Vocabulary Strength', value: '88%', color: 'text-primary', bgColor: 'bg-primary' },
  { label: 'Originality', value: '95%', color: 'text-success-default', bgColor: 'bg-success-default' },
];

export function StudentDashboardTab() {
  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-support/10 border-primary/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl text-neutral-900 mb-2">Keep up the great work! 🎓</h2>
            <p className="text-neutral-600">Your writing has improved by 12% this month. Ready to submit your next essay?</p>
          </div>
          <Button className="bg-primary hover:bg-primary-300">
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
            {/* Last Submitted Essay */}
            <div className="p-4 bg-neutral-50 rounded-rd border border-neutral-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-info-default/10 rounded-rd flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-info-default" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-neutral-900">Climate Change Impact</h3>
                    <Badge className="bg-blue-600 text-white">New</Badge>
                  </div>
                  <p className="text-sm text-neutral-500">Submitted 5 mins ago</p>
                  <p className="text-sm text-neutral-600 mt-2">Currently under AI evaluation</p>
                </div>
              </div>
            </div>

            {/* Latest AI Feedback */}
            <div className="p-4 bg-success-default/5 rounded-rd border border-success-default/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-success-default/10 rounded-rd flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-success-default" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-neutral-900">Machine Learning Ethics</h3>
                    <Badge className="bg-success-default text-white">85%</Badge>
                  </div>
                  <p className="text-sm text-neutral-500">Evaluated 15 mins ago</p>
                  <p className="text-sm text-neutral-600 mt-2">Great improvement in coherence and structure!</p>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Eye className="w-3 h-3 mr-2" />
                    View Feedback
                  </Button>
                </div>
              </div>
            </div>

            {/* Teacher Comment */}
            <div className="p-4 bg-primary/5 rounded-rd border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-rd flex items-center justify-center flex-shrink-0">
                  <span className="text-primary">👨‍🏫</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-neutral-900">Economic Theory</h3>
                    <Badge className="bg-primary text-white">92%</Badge>
                  </div>
                  <p className="text-sm text-neutral-500">Prof. Thompson • 2 hours ago</p>
                  <p className="text-sm text-neutral-600 mt-2 italic">"Excellent analysis and well-structured arguments. Keep up the good work!"</p>
                </div>
              </div>
            </div>
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
                <h3 className="text-neutral-900 mb-1">Your Strength</h3>
                <p className="text-sm text-neutral-600">
                  Your grammar has improved by <strong className="text-success-default">15%</strong> in the last 5 essays. Excellent progress!
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
