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

interface StudentHeaderProps {
  onMenuClick: () => void;
  isBurgerActive: boolean;
}

const StudentHeader: React.FC<StudentHeaderProps> = ({
  onMenuClick,
  isBurgerActive,
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

  useEffect(() => {
    if (!user?.auth_id) return;

    const userId = user.auth_id;

    const loadNotifications = async () => {
      const fetched = await fetchUserNotifications(userId);
      setNotifications(fetched);
    };

    loadNotifications();

    const channel = subscribeToNotifications(userId, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.auth_id]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    if (user?.auth_id) {
      await markNotificationAsRead(id, user.auth_id);
    }
  };

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

  useEffect(() => {
    let timer: number;
    if (loading) {
      setProgress(0);
      const start = Date.now();
      const step = () => {
        const elapsed = Date.now() - start;
        const value = Math.min(95, elapsed / 12); 
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

  const getDisplayName = () => {
    if (user?.first_name) {
      return user.first_name;
    }
    return user?.username?.split('@')[0] || "Student";
  };

  const userName = getDisplayName();
  const userInitial = (user?.first_name || userName).charAt(0).toUpperCase();

  return (
    <header className="relative bg-white border-b border-neutral-100 h-14 flex items-center justify-between px-4 sm:px-6 z-40">
      {/* Left Section: Menu Toggle and Current Label */}
      <div className='flex items-center space-x-3 min-w-0'>
        <button
          onClick={onMenuClick}
          className='p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors flex-shrink-0 lg:hidden'
        >
          {isBurgerActive ? (
            <X className='w-5 h-5' />
          ) : (
            <Menu className='w-5 h-5' />
          )}
        </button>

        <h1 className="text-base font-bold text-neutral-800 truncate tracking-tight">
          {currentLabel}
        </h1>
      </div>

      {/* Right Section: Notifications and User Profile */}
      <div className='flex items-center space-x-2 sm:space-x-3 flex-shrink-0 relative'>
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
            className='w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-white text-sm font-bold flex-shrink-0'
            title={userName}
          >
            {userInitial}
          </div>

          <div className='hidden md:flex ml-3 flex-col text-left'>
            <p className='font-bold text-sm text-neutral-800 whitespace-nowrap truncate max-w-[140px] tracking-tight'>{userName}</p>
            <p className='text-[11px] uppercase tracking-[0.14em] font-bold text-neutral-400'>Student</p>
          </div>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className='absolute right-0 top-full pt-1.5 w-48 z-50'
              >
                <div className='bg-white shadow-lg rounded-xl overflow-hidden border border-neutral-100 p-1'>
                  <div className='px-3.5 py-3 border-b border-neutral-50 mb-0.5'>
                    <p className='text-sm font-bold text-neutral-900 truncate tracking-tight'>
                      {userName}
                    </p>
                    <p className='text-[11px] font-bold text-neutral-400 truncate uppercase tracking-widest mt-0.5'>
                      {user?.email || ""}
                    </p>
                  </div>
                  <div className='space-y-0.5'>
                    <button
                      className='flex items-center gap-2.5 px-3 py-2.5 hover:bg-neutral-50 text-neutral-600 rounded-lg w-full text-left transition-colors text-sm font-bold'
                      onClick={() => {
                        navigate("/Student/Settings");
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Settings className="w-4 h-4 text-neutral-400" /> Settings
                    </button>
                    <button
                      className='flex items-center gap-2.5 px-3 py-2.5 hover:bg-error-default/5 text-error-default rounded-lg w-full text-left transition-colors text-sm font-bold'
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" /> Log Out
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Top progress bar */}
      <div className='absolute bottom-0 left-0 w-full h-[1.5px] overflow-hidden'>
        <motion.div
          className='h-full bg-primary'
          style={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.1 }}
        />
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4'>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className='bg-white rounded-xl shadow-2xl p-5 w-full max-w-xs space-y-4 border border-neutral-100'
            >
              <div className="w-10 h-10 bg-error-default/10 rounded-xl flex items-center justify-center">
                <LogOut className="w-5 h-5 text-error-default" />
              </div>
              <div>
                <h3 className='text-base font-bold text-neutral-900'>
                  Logout
                </h3>
                <p className='text-sm text-neutral-400 mt-1 font-medium'>
                  Are you sure you want to logout?
                </p>
              </div>
              <div className='flex gap-2 pt-1'>
                <button
                  className='flex-1 px-4 py-2.5 rounded-lg border border-neutral-200 text-sm font-bold text-neutral-600 hover:bg-neutral-50 transition-colors'
                  onClick={cancelLogout}
                >
                  Cancel
                </button>
                <button
                  className='flex-1 px-4 py-2.5 rounded-lg bg-error-default text-white text-sm font-bold hover:bg-error-dark transition-colors shadow-md shadow-error-default/15'
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