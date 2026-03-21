import { useState, useEffect } from "react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Bell, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../../services/notificationService";
import { fetchTeacherUUID } from "../../services/rubricService";
import type { Notification } from "../../data/notificationsData";

export function NotificationsTab() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications from Supabase
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      const teacherUUID = await fetchTeacherUUID();
      if (teacherUUID) {
        const fetchedNotifications = await fetchUserNotifications(teacherUUID);
        setNotifications(fetchedNotifications);
      }
      setIsLoading(false);
    };

    loadNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    // Update in Supabase
    const teacherUUID = await fetchTeacherUUID();
    if (teacherUUID) {
      await markNotificationAsRead(id, teacherUUID);
    }
  };

  const handleMarkAllAsRead = async () => {
    // Optimistically update UI
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // Update in Supabase
    const teacherUUID = await fetchTeacherUUID();
    if (teacherUUID) {
      await markAllNotificationsAsRead(teacherUUID);
    }
  };

  const getNotificationIcon = () => {
    return Bell; // You can customize icons per type
  };
  
  const handleNotificationClick = async (notification: Notification) => {
    // 1. Mark as read if not already handled by child button
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // 2. Navigate based on type
    if (notification.relatedId) {
      switch (notification.type) {
        case "student_submitted":
        case "resubmission_requested":
        case "submission_received":
          // Navigate to Activities Tab with the specific activity selected
          navigate(`/Teacher/Activities?activityId=${notification.relatedId}`);
          break;
        case "activity_missed":
          navigate(`/Teacher/Activities?activityId=${notification.relatedId}`);
          break;
        default:
          // Try to navigate to Activities if it looks like an activity ID
          if (!isNaN(parseInt(notification.relatedId))) {
             navigate(`/Teacher/Activities?activityId=${notification.relatedId}`);
          }
          break;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-neutral-900">Notifications</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-neutral-300 animate-pulse" />
            <p className="text-neutral-500">Loading notifications...</p>
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
            <p className="text-neutral-500">No notifications</p>
          </Card>
        ) : (
          notifications.map((notification) => {
            const Icon = getNotificationIcon();
            return (
              <Card
                key={notification.id}
                className={`p-5 transition-all hover:shadow-md cursor-pointer ${
                  !notification.read
                    ? "border-l-4 border-l-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 text-primary p-3 rounded-rd flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3
                        className={`font-medium ${
                          !notification.read
                            ? "text-neutral-900"
                            : "text-neutral-700"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <Badge className="bg-primary text-white flex-shrink-0">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-neutral-400">
                        {notification.timestamp}
                      </p>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={(e?: React.MouseEvent<HTMLButtonElement>) => {
                            e?.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

