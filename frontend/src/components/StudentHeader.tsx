import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Menu,
  X,
  Settings,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useLoader } from "./ui/LoaderContext";
import { useAuth } from "../contexts/AuthContext";
import { NotificationDropdown } from "./ui/NotificationDropdown";
import {
  fetchUserNotifications,
  subscribeToNotifications,
  markNotificationAsRead,
} from "../services/notificationService";
import type { Notification } from "../types/notification";

// Updated interface to include the user's role
interface StudentHeaderProps {
  onMenuClick: () => void;
  isBurgerActive: boolean;
  role: "Admin" | "Teacher" | "Student"; // Role prop remains for display
}

// Renamed component
const StudentHeader: React.FC<StudentHeaderProps> = ({
  onMenuClick,
  isBurgerActive,
  role, // Destructured role prop
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { loading } = useLoader();
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Load and Subscribe to Notifications
  useEffect(() => {
    if (!user?.auth_id) return;

    const userId = user.auth_id;

    const loadNotifications = async () => {
      const fetched = await fetchUserNotifications(userId);
      setNotifications(fetched);
    };

    loadNotifications();

    // Subscribe to real-time notifications
    const channel = subscribeToNotifications(userId, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      
      // Optional: Play sound or show toast here
      if (Notification.permission === "granted") {
        new window.Notification(newNotif.title, {
          body: newNotif.message,
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleMarkAsRead = async (id: string) => {
    // Update locally
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    // Update in Supabase
    if (user?.auth_id) {
      await markNotificationAsRead(id, user.auth_id);
    }
  };

  // Updated route labels for Student paths
  const routeLabels: Record<string, string> = {
    "/Student/Dashboard": "Dashboard",
    "/Student/Submit": "Submit Essay",
    "/Student/Essays": "My Essays",
    "/Student/Essays/Result": "Essay Transcript",
    "/Student/Feedback": "AI Feedback",
    "/Student/Progress": "Progress & Analytics",
    "/Student/Rubric": "Rubric / Criteria",
    "/Student/Notifications": "Notifications",
    "/Student/Settings": "Settings",
    "/Student/Help": "Support Center",
    "/Student/Classes": "My Classes",
  };

  const getLabel = () => {
    if (location.pathname.startsWith("/Student/Classes/")) return "Class Detail";
    return routeLabels[location.pathname] || "Dashboard";
  };

  const currentLabel = getLabel();

  // Animate progress bar (Same logic)
  useEffect(() => {
    let timer: number;
    if (loading) {
      setProgress(0);
      const start = Date.now();
      const step = () => {
        const elapsed = Date.now() - start;
        const value = Math.min(95, elapsed / 12); // max 95%
        setProgress(value);
        if (value < 95) timer = setTimeout(step, 16);
      };
      step();
    } else {
      setProgress(100);
      timer = setTimeout(() => setProgress(0), 300);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/Student/Login");
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Extract only the last name if possible, otherwise use full name or fallback
  const getDisplayName = () => {
    if (!user?.full_name || user.full_name === "Student" || user.full_name.includes("@")) {
      return user?.username || "Student";
    }
    // If it's a full name like "John Doe", just get "Doe"
    const nameParts = user.full_name.trim().split(/\s+/);
    return nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
  };

  const userName = getDisplayName();
  const userInitial = (user?.full_name || userName).split(/\s+/).map((part) => part.charAt(0).toUpperCase()).join("").slice(0, 2);

  return (
    <header className='relative flex flex-row justify-between items-center px-4 py-3 border-b bg-white shadow-sm'>
      
      {/* 1. Left Section: Menu Toggle and Current Label */}
      <div className='flex items-center space-x-3 min-w-0'>
        <button
          onClick={onMenuClick}
          className='p-2 rounded-lg hover:bg-neutral-100 transition-colors flex-shrink-0 lg:hidden'
        >
          {isBurgerActive ? (
            <X className='w-6 h-6 text-neutral-900' />
          ) : (
            <Menu className='w-6 h-6 text-neutral-900' />
          )}
        </button>

        <AnimatePresence mode='wait'>
          <motion.div
            key={currentLabel}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className='flex items-center min-w-0'
          >
            <h2 className='text-lg sm:text-xl font-bold text-neutral-900 truncate'>
              {currentLabel}
            </h2>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. Right Section: Notifications and User Profile */}
      <div className='flex items-center space-x-2 sm:space-x-4 flex-shrink-0 relative'>
        {/* Notification Dropdown */}
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          role="Student"
          onMarkAsRead={handleMarkAsRead}
        />

        {/* User Profile Container */}
        <div
          className='flex items-center cursor-pointer relative group'
          onMouseEnter={() => !isMobile && setIsDropdownOpen(true)}
          onMouseLeave={() => !isMobile && setIsDropdownOpen(false)}
          onClick={() => isMobile && setIsDropdownOpen(!isDropdownOpen)}
        >
          {/* User Avatar */}
          <div
            className='w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white text-lg font-bold flex-shrink-0 shadow-sm'
            title={userName}
          >
            {userInitial}
          </div>

          {/* User Name and Role - Hidden on mobile, shown on tablet+ */}
          <div className='hidden md:flex ml-3 flex-col text-left'>
            <p className='font-semibold text-sm text-neutral-900 whitespace-nowrap truncate max-w-[150px]'>{userName}</p>
            <p className='text-[10px] uppercase tracking-wider font-bold text-neutral-400'>{role}</p>
          </div>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className='absolute right-0 top-full pt-2 w-56 z-50'
              >
                <div className='bg-white shadow-xl rounded-xl overflow-hidden border border-neutral-100 p-1'>
                  <div className='px-4 py-3 border-b border-neutral-50 mb-1'>
                    <p className='font-bold text-neutral-900 truncate'>
                      {userName}
                    </p>
                    <p className='text-xs text-neutral-500 truncate'>
                      {user?.email || ""}
                    </p>
                  </div>
                  <div className='space-y-1'>
                    <button
                      className='flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 text-neutral-700 rounded-lg w-full text-left transition-colors text-sm font-medium'
                      onClick={() => {
                        navigate("/Student/Settings");
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Settings size={16} className="text-neutral-400" /> Settings
                    </button>
                    <button
                      className='flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 text-red-600 rounded-lg w-full text-left transition-colors text-sm font-medium'
                      onClick={handleLogout}
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Top progress bar */}
      <div className='absolute bottom-0 left-0 w-full h-[2px] overflow-hidden'>
        <motion.div
          className='h-full bg-gradient-to-r from-primary to-primary/20'
          style={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.1 }}
        />
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4'>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className='bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-5 border border-neutral-100'
            >
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                <LogOut size={24} />
              </div>
              <div>
                <h3 className='text-lg font-bold text-neutral-900'>
                  Sign Out
                </h3>
                <p className='text-sm text-neutral-500 mt-1'>
                  Are you sure you want to log out of your student account?
                </p>
              </div>
              <div className='flex gap-3 pt-2'>
                <button
                  className='flex-1 px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 font-semibold hover:bg-neutral-50 transition-colors'
                  onClick={cancelLogout}
                >
                  Cancel
                </button>
                <button
                  className='flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-200'
                  onClick={confirmLogout}
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default StudentHeader;