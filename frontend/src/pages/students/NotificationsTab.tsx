import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, ArrowRight, Zap, Info, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { 
  fetchUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  subscribeToNotifications 
} from "../../services/notificationService";
import type { Notification } from "../../types/notification";
import { buildSecureUrl } from "../../utils/secureUrl";
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationsTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load and Subscribe to Notifications
  useEffect(() => {
    if (!user?.auth_id) return;

    const userId = user.auth_id;

    const loadNotifications = async () => {
      setIsLoading(true);
      const fetched = await fetchUserNotifications(userId);
      setNotifications(fetched);
      setIsLoading(false);
    };

    loadNotifications();

    const channel = subscribeToNotifications(userId, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.auth_id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user?.auth_id) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    await markNotificationAsRead(id, user.auth_id);
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.auth_id) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsAsRead(user.auth_id);
  };

  const getNotificationStyles = (type: string) => {
    switch (type) {
      case 'essay_graded':
        return { icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50' };
      case 'new_activity':
        return { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' };
      case 'resubmission_open':
      case 'resubmission_allowed':
        return { icon: ArrowRight, color: 'text-emerald-500', bg: 'bg-emerald-50' };
      case 'upcoming_deadline':
        return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' };
      default:
        return { icon: Bell, color: 'text-primary', bg: 'bg-primary/5' };
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    let rawRelatedId = notification.relatedId;
    console.log("[NotificationsTab] Clicked notification:", notification.id, "Type:", notification.type, "rawRelatedId:", rawRelatedId);
    
    let activityId = "";
    let essayId = "";
    let studentId = "";

    // 1. Robust Metadata Extraction
    if (rawRelatedId) {
      if (typeof rawRelatedId === 'object') {
        const parsed = rawRelatedId as any;
        activityId = parsed.activityId || parsed.id || "";
        essayId = parsed.essayId || "";
        studentId = parsed.studentId || "";
      } else if (typeof rawRelatedId === 'string') {
        const trimmed = rawRelatedId.trim();
        if (trimmed.startsWith("{")) {
          try {
            const parsed = JSON.parse(trimmed);
            activityId = parsed.activityId || parsed.id || "";
            essayId = parsed.essayId || "";
            studentId = parsed.studentId || "";
          } catch (e) {
            console.error("[NotificationsTab] JSON parse error:", e);
            activityId = trimmed;
          }
        } else {
          if (notification.type === 'essay_graded' || notification.type === 'essay_feedback') {
            essayId = trimmed;
          } else {
            activityId = trimmed;
          }
        }
      }
    }

    console.log("[NotificationsTab] Extracted IDs:", { activityId, essayId, studentId });

    // 2. Perform Navigation
    const targetId = activityId || essayId;
    if (!targetId) {
      console.warn("[NotificationsTab] No target ID found, cannot navigate.");
      return;
    }

    const params: Record<string, string> = { activityId: targetId };
    if (studentId || user?.auth_id) params.studentId = studentId || user?.auth_id || "";
    
    let targetPath = '/Student/Submit';
    switch (notification.type) {
      case "essay_graded":
        if (essayId) params.essayId = essayId;
        targetPath = '/Student/Essays/Result';
        break;
      case "essay_feedback":
        if (essayId) params.essayId = essayId;
        targetPath = '/Student/Feedback';
        break;
      default:
        targetPath = '/Student/Submit';
        break;
    }
    
    const url = buildSecureUrl(targetPath, params);
    console.log("[NotificationsTab] Navigating to:", url, "Params:", params);
    navigate(url);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Checking for news...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 px-1">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">Updates</h1>
          <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <Bell size={14} className="text-primary/50" />
            {unreadCount > 0 ? `${unreadCount} new updates for you` : "You're all done!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 bg-white border border-neutral-100 text-neutral-500 text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-sm hover:bg-neutral-50 transition-all"
          >
            <Check size={12} />
            Clean Up
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-neutral-50 shadow-sm">
            <div className="w-20 h-20 bg-neutral-50 rounded-3xl flex items-center justify-center mb-6">
               <CheckCircle size={32} className="text-neutral-200" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">No new updates right now</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notification, i) => {
              const { icon: Icon, color, bg } = getNotificationStyles(notification.type);
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    relative group p-6 rounded-3xl border transition-all flex items-start gap-5 cursor-pointer
                    ${!notification.read 
                      ? 'bg-white border-primary/20 shadow-lg shadow-primary/5' 
                      : 'bg-neutral-50/50 border-neutral-100 opacity-80 hover:bg-white hover:opacity-100'}
                  `}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${bg} ${color}`}>
                    <Icon size={20} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className={`text-sm font-bold tracking-tight ${!notification.read ? 'text-neutral-900' : 'text-neutral-500'}`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="shrink-0 w-2 h-2 bg-primary rounded-full animate-pulse mt-2" title="Fresh" />
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed mb-3 ${!notification.read ? 'text-neutral-600 font-medium' : 'text-neutral-400'}`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">
                        {notification.timestamp}
                      </span>
                      {!notification.read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                        >
                          I've seen this
                        </button>
                      )}
                    </div>
                  </div>

                  {!notification.read && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
