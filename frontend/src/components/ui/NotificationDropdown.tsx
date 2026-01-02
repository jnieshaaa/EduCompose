/**
 * Notification Dropdown Component
 * Displays notifications in a dropdown menu
 */

import { useState, useRef, useEffect } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Notification } from "../../data/notificationsData";

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  role: "Teacher" | "Student";
  onMarkAsRead?: (id: string) => void;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  role,
  onMarkAsRead,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleShowMore = () => {
    setIsOpen(false);
    if (role === "Teacher") {
      navigate("/Teacher/Notifications");
    } else {
      navigate("/Student/Notifications");
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    setIsOpen(false);
    
    // Navigate based on notification type and related_id
    if (notification.relatedId) {
      try {
        // Parse related_id if it's JSON (for essay_graded notifications)
        const relatedData = JSON.parse(notification.relatedId);
        if (relatedData.studentId && relatedData.activityId && relatedData.studentName) {
          // Navigate to AnalysisResults with student data
          navigate("/AnalysisResults", {
            state: {
              studentId: relatedData.studentId,
              studentName: relatedData.studentName,
              activityId: relatedData.activityId,
              essayId: relatedData.essayId,
            },
          });
          return;
        }
      } catch {
        // If parsing fails, relatedId might be a simple string
        // Handle other notification types here if needed
      }
    }
  };

  const formatTime = (timestamp: string) => {
    return timestamp; // Already formatted in mock data
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-neutral-300/30 transition-colors relative"
      >
        <Bell className="w-6 h-6 text-neutral-900" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-error-default text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute right-0 top-full mt-2 w-96 bg-white shadow-lg rounded-rd border border-neutral-200 z-50 max-h-[500px] flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-sm text-neutral-500">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-neutral-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 hover:bg-neutral-50 cursor-pointer transition-colors ${
                        !notification.read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4
                              className={`text-sm font-medium ${
                                !notification.read
                                  ? "text-neutral-900"
                                  : "text-neutral-700"
                              }`}
                            >
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-sm text-neutral-600 mb-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer - Show More Link */}
            {notifications.length > 5 && (
              <div className="px-4 py-3 border-t border-neutral-200">
                <button
                  onClick={handleShowMore}
                  className="w-full flex items-center justify-center gap-2 text-sm text-primary hover:text-primary-300 font-medium transition-colors"
                >
                  Show more notifications
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {notifications.length > 0 && notifications.length <= 5 && (
              <div className="px-4 py-3 border-t border-neutral-200">
                <button
                  onClick={handleShowMore}
                  className="w-full flex items-center justify-center gap-2 text-sm text-primary hover:text-primary-300 font-medium transition-colors"
                >
                  View all notifications
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

