import Card from "../../components/ui/Card";
import { BookOpen, Layers, Users, FileText, CheckCircle, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import Badge from "../../components/ui/Badge";

const statsCards = [
  { label: 'Total Programs', value: '12', icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Total Sections', value: '28', icon: Layers, color: 'text-support', bg: 'bg-support/10' },
  { label: 'Total Students', value: '456', icon: Users, color: 'text-secondary', bg: 'bg-secondary/10' },
  { label: 'Essays Submitted', value: '1,234', icon: FileText, color: 'text-info-default', bg: 'bg-info-default/10' },
  { label: 'Essays Evaluated', value: '1,180', icon: CheckCircle, color: 'text-success-default', bg: 'bg-success-default/10' },
  { label: 'Pending Reviews', value: '54', icon: Clock, color: 'text-warning-default', bg: 'bg-warning-default/10' },
];

const performanceMetrics = [
  { label: 'Average Essay Score', value: '82.5%', trend: '+2.3%', status: 'up' },
  { label: 'Grammar Accuracy', value: '88.2%', trend: '+1.5%', status: 'up' },
  { label: 'Coherence Score', value: '79.8%', trend: '-0.8%', status: 'down' },
  { label: 'Vocabulary Complexity', value: '7.2/10', trend: '+0.4', status: 'up' },
];

const recentActivity = [
  { student: 'Emma Wilson', action: 'Submitted essay', essay: 'Climate Change Impact', time: '5 mins ago', status: 'new' },
  { student: 'James Lee', action: 'Essay evaluated', essay: 'Machine Learning Ethics', time: '15 mins ago', status: 'evaluated', score: 85 },
  { student: 'Sarah Martinez', action: 'Submitted essay', essay: 'Economic Theory', time: '32 mins ago', status: 'new' },
  { student: 'Michael Chen', action: 'Essay evaluated', essay: 'Social Media Effects', time: '1 hour ago', status: 'evaluated', score: 92 },
  { student: 'Olivia Brown', action: 'Needs review', essay: 'Historical Analysis', time: '2 hours ago', status: 'review' },
];

const alerts = [
  { type: 'warning', message: '3 students have not submitted essays this week', count: 3 },
  { type: 'error', message: '2 essays flagged for high plagiarism risk', count: 2 },
  { type: 'info', message: '5 students showing consistent improvement', count: 5 },
];

export function DashboardTab() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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

      {/* Performance Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl text-neutral-900">Performance Overview</h2>
          <Badge className="bg-primary/10 text-primary">AI-Powered</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceMetrics.map((metric, idx) => (
            <div key={idx} className="space-y-2">
              <p className="text-sm text-neutral-500">{metric.label}</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl text-neutral-900">{metric.value}</p>
                <div className={`flex items-center text-sm ${
                  metric.status === 'up' ? 'text-success-default' : 'text-error-default'
                }`}>
                  <TrendingUp className={`w-4 h-4 mr-1 ${
                    metric.status === 'down' ? 'rotate-180' : ''
                  }`} />
                  {metric.trend}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-xl text-neutral-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-neutral-100 rounded-rd hover:bg-neutral-200 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-neutral-900">{activity.student}</span>
                    <span className="text-sm text-neutral-500">•</span>
                    <span className="text-sm text-neutral-500">{activity.action}</span>
                  </div>
                  <p className="text-sm text-neutral-600">{activity.essay}</p>
                </div>
                <div className="flex items-center gap-3">
                  {activity.status === 'new' && (
                    <Badge className="bg-info-default text-white">New</Badge>
                  )}
                  {activity.status === 'evaluated' && activity.score && (
                    <Badge className="bg-success-default text-white">{activity.score}%</Badge>
                  )}
                  {activity.status === 'review' && (
                    <Badge className="bg-warning-default text-white">Review</Badge>
                  )}
                  <span className="text-xs text-neutral-400 whitespace-nowrap">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Alerts */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">Alerts</h2>
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className={`p-4 rounded-rd border-l-4 ${
                alert.type === 'warning' ? 'bg-warning-light/20 border-warning-default' :
                alert.type === 'error' ? 'bg-error-light/20 border-error-default' :
                'bg-info-light/20 border-info-default'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    alert.type === 'warning' ? 'text-warning-default' :
                    alert.type === 'error' ? 'text-error-default' :
                    'text-info-default'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-neutral-900">{alert.message}</p>
                  </div>
                  <Badge className={`${
                    alert.type === 'warning' ? 'bg-warning-default' :
                    alert.type === 'error' ? 'bg-error-default' :
                    'bg-info-default'
                  } text-white`}>
                    {alert.count}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
