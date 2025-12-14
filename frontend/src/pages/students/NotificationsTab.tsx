import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { CheckCircle, MessageSquare, AlertCircle, Clock, Bell } from 'lucide-react';

const notifications = [
  {
    id: 1,
    type: 'evaluation',
    title: 'Essay Evaluated',
    message: 'Your essay "Machine Learning Ethics" has been evaluated by AI. Score: 85%',
    time: '15 mins ago',
    read: false,
    icon: CheckCircle,
    color: 'text-success-default',
    bgColor: 'bg-success-default/10'
  },
  {
    id: 2,
    type: 'feedback',
    title: 'Teacher Feedback Added',
    message: 'Prof. Thompson added feedback to "Economic Theory Analysis"',
    time: '2 hours ago',
    read: false,
    icon: MessageSquare,
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  {
    id: 3,
    type: 'revision',
    title: 'Revision Requested',
    message: 'Please revise and resubmit "Historical Analysis of WWI"',
    time: '5 hours ago',
    read: true,
    icon: AlertCircle,
    color: 'text-warning-default',
    bgColor: 'bg-warning-default/10'
  },
  {
    id: 4,
    type: 'deadline',
    title: 'Upcoming Deadline',
    message: 'Essay due for Week 8 Assignment in 3 days',
    time: '1 day ago',
    read: true,
    icon: Clock,
    color: 'text-error-default',
    bgColor: 'bg-error-default/10'
  },
  {
    id: 5,
    type: 'evaluation',
    title: 'Essay Evaluated',
    message: 'Your essay "Social Media Effects" has been evaluated. Score: 87%',
    time: '2 days ago',
    read: true,
    icon: CheckCircle,
    color: 'text-success-default',
    bgColor: 'bg-success-default/10'
  },
  {
    id: 6,
    type: 'feedback',
    title: 'Teacher Feedback Added',
    message: 'Prof. Thompson: "Excellent work on your latest essay!"',
    time: '3 days ago',
    read: true,
    icon: MessageSquare,
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
];

export function NotificationsTab() {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900">Notifications</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <Button variant="outline">Mark All as Read</Button>
      </div>

      {/* Notification Categories */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="bg-primary text-white hover:bg-primary-300">
            All
          </Button>
          <Button variant="outline" size="sm">
            Evaluations
          </Button>
          <Button variant="outline" size="sm">
            Feedback
          </Button>
          <Button variant="outline" size="sm">
            Deadlines
          </Button>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notification) => {
          const Icon = notification.icon;
          return (
            <Card 
              key={notification.id} 
              className={`p-5 transition-all hover:shadow-md cursor-pointer ${
                !notification.read ? 'border-l-4 border-l-primary bg-primary/5' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`${notification.bgColor} ${notification.color} p-3 rounded-rd flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className={`${!notification.read ? 'text-neutral-900' : 'text-neutral-700'}`}>
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <Badge className="bg-primary text-white flex-shrink-0">New</Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-600 mb-2">{notification.message}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-400">{notification.time}</p>
                    {!notification.read && (
                      <Button variant="ghost" size="sm" className="text-xs">
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State (if no notifications) */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
            <Bell className="w-12 h-12 text-neutral-400" />
          </div>
          <h2 className="text-2xl text-neutral-900 mb-2">No notifications</h2>
          <p className="text-neutral-500 text-center max-w-md">
            You're all caught up! Notifications about essay evaluations, teacher feedback, and deadlines will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
