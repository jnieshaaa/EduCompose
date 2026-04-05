/**
 * Notification Dropdown Component
 * Displays notifications in a dropdown menu
 */

import { useState, useRef, useEffect } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Notification } from "../../types/notification";
import { buildSecureUrl } from "../../utils/secureUrl";

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  role: "Admin" | "Teacher" | "Student";
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

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    setIsOpen(false);
    
    // 2. Extract ID (handle both plain and JSON strings)
    let rawRelatedId = notification.relatedId;
    let activityId = "";
    let essayId = "";
    let studentId = "";

    if (rawRelatedId && rawRelatedId.startsWith("{")) {
       try {
         const parsed = JSON.parse(rawRelatedId);
         activityId = parsed.activityId || "";
         essayId = parsed.essayId || "";
         studentId = parsed.studentId || "";
         if (!activityId && !essayId) {
            activityId = parsed.id || rawRelatedId;
         }
       } catch (e) {
         console.error("Failed to parse JSON relatedId:", e);
         activityId = rawRelatedId;
       }
    } else {
      activityId = rawRelatedId || "";
      essayId = rawRelatedId || "";
    }

    // 3. Navigate based on role and type
    if (role === 'Teacher') {
      const idToUse = activityId || essayId;
      if (idToUse) {
        // Fetch Metadata for Breadcrumbs and Deep Linking
        const { fetchActivityBreadcrumbInfo } = await import("../../services/activityService");
        const info = await fetchActivityBreadcrumbInfo(
          activityId || "", 
          studentId || "",
          essayId || ""
        );

        const params: Record<string, string> = {};
        if (idToUse) params.activityId = idToUse;
        if (info) {
          if (info.activityTitle) params.activityTitle = info.activityTitle;
          if (info.courseName) params.courseName = info.courseName;
          if (info.courseId) params.courseId = info.courseId;
          if (info.sectionId) params.sectionId = info.sectionId;
          if (info.courseSection) params.courseSection = info.courseSection;
        }

        switch (notification.type) {
          case "student_submitted":
          case "resubmission_requested":
          case "resubmission_request":
          case "submission_received":
          case "essay_graded":
          case "activity_missed":
            navigate(buildSecureUrl('/Teacher/Activities', params));
            break;
          default:
            if (!isNaN(parseInt(idToUse))) {
               navigate(buildSecureUrl('/Teacher/Activities', params));
            }
            break;
        }
      }
    } else if (role === 'Student') {
      if (activityId || essayId) {
        // Fetch Breadcrumb Info for better header experience
        const { fetchActivityBreadcrumbInfo } = await import("../../services/activityService");
        const info = await fetchActivityBreadcrumbInfo(activityId || essayId);

        const params: Record<string, string> = {
          activityId: activityId || essayId,
        };
        if (info) {
          if (info.programAbbr) params.programAbbr = info.programAbbr;
          if (info.courseName) params.courseName = info.courseName;
          if (info.activityTitle) params.activityTitle = info.activityTitle;
        }

        switch (notification.type) {
          case "new_activity":
          case "resubmission_open":
          case "resubmission_allowed":
          case "upcoming_deadline":
          case "revision_requested":
            // Lead to the Submit Essay page
            navigate(buildSecureUrl('/Student/Submit', params));
            break;
          case "essay_graded":
            // Lead to Feedback page
            if (essayId) params.essayId = essayId;
            navigate(buildSecureUrl('/Student/Feedback', params));
            break;
          default:
            if (!isNaN(parseInt(activityId))) {
              navigate(buildSecureUrl('/Student/Submit', params));
            }
            break;
        }
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

