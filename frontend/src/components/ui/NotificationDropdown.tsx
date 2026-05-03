/**
 * Notification Dropdown Component
 * Displays notifications in a dropdown menu
 */

import { useState, useRef, useEffect } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Notification } from "../../types/notification";
import { handleNotificationNavigation } from "../../utils/notificationNavigation";
import { useAuth } from "../../contexts/AuthContext";

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
  const { user } = useAuth();

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
    } else if (role === "Admin") {
      // Assuming admins might have notification page later or use teacher's
    } else {
      navigate("/Student/Notifications");
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    setIsOpen(false);
    
    if (role === 'Admin') return; // Admin navigation not yet defined here

    handleNotificationNavigation(
      notification,
      role,
      user?.auth_id,
      navigate
    );
  };


  const formatTime = (timestamp: string) => {
    return timestamp; 
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg hover:bg-neutral-50 transition-colors relative text-neutral-500 hover:text-neutral-800"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-error-default text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute right-0 top-full mt-1.5 w-80 bg-white shadow-xl rounded-xl border border-neutral-100 z-50 max-h-[480px] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/30">
              <h3 className="text-sm font-bold text-neutral-800">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {unreadCount} UNREAD
                </span>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 scrollbar-hide">
              {notifications.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-neutral-100" />
                  <p className="text-xs text-neutral-300">Quiet for now.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-50">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 hover:bg-neutral-50/50 cursor-pointer transition-colors relative group ${
                        !notification.read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h4 className={`text-[12px] font-bold truncate ${!notification.read ? "text-neutral-900" : "text-neutral-700"}`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                            )}
                          </div>
                          <p className={`text-[11px] leading-relaxed line-clamp-2 ${!notification.read ? "text-neutral-600" : "text-neutral-400"}`}>
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-neutral-300 mt-1 uppercase font-semibold">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-neutral-50 bg-neutral-50/30">
              <button
                onClick={handleShowMore}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-primary hover:text-primary-600 transition-colors py-1"
              >
                {notifications.length > 5 ? "Show More" : "View All"}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
