import React, { useEffect, useState } from "react";
import {
  Menu,
  X,
  Settings,
  LogOut,
  Shield,
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
import { supabase } from "../lib/supabaseClient";

interface AdminHeaderProps {
  onMenuClick: () => void;
  isBurgerActive: boolean;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
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

  // Load and Subscribe to Notifications
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
    "/Admin/Dashboard": "Admin Dashboard",
    "/Admin/Users": "User Management",
    "/Admin/Students": "Student Directory",
    "/Admin/Rubrics": "Platform Rubrics",
    "/Admin/Content": "Content Management",
    "/Admin/Schools": "Academics",
    "/Admin/Settings": "System Settings",
    "/Admin/Archive": "Archive Records",
  };

  const currentLabel = routeLabels[location.pathname] || "Admin Portal";

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

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/");
  };

  const userName = user?.full_name || "Admin";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className='relative bg-white border-b border-neutral-200 h-16 flex items-center justify-between px-4 sm:px-6 z-40'>
      <div className='flex items-center'>
        <button
          onClick={onMenuClick}
          className='p-2 rounded-lg hover:bg-neutral-100 transition-colors lg:hidden mr-2'
        >
          {isBurgerActive ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-neutral-900 truncate">
          {currentLabel}
        </h2>
      </div>

      <div className='flex items-center space-x-2 sm:space-x-4'>
        <NotificationDropdown
          notifications={notifications}
          unreadCount={notifications.filter(n => !n.read).length}
          role="Admin"
          onMarkAsRead={handleMarkAsRead}
        />

        <div
          className='flex items-center cursor-pointer relative group'
          onMouseEnter={() => !isMobile && setIsDropdownOpen(true)}
          onMouseLeave={() => !isMobile && setIsDropdownOpen(false)}
          onClick={() => isMobile && setIsDropdownOpen(!isDropdownOpen)}
        >
          <div className='w-10 h-10 rounded-full flex items-center justify-center bg-red-600 text-white font-bold shadow-sm'>
            {userInitial}
          </div>

          <div className='hidden md:flex ml-3 flex-col text-left'>
            <p className='font-semibold text-sm text-neutral-900 truncate max-w-[120px]'>{userName}</p>
            <p className='text-[10px] uppercase tracking-wider font-bold text-neutral-400'>Admin</p>
          </div>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className='absolute right-0 top-full pt-2 w-56 z-50'
              >
                <div className='bg-white shadow-xl rounded-xl overflow-hidden border border-neutral-100 p-1'>
                  <div className='px-4 py-3 border-b border-neutral-50 mb-1'>
                    <p className='font-bold text-neutral-900 truncate'>{userName}</p>
                    <p className='text-xs text-neutral-500 truncate'>{user?.email}</p>
                  </div>
                  <button
                    className='flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 text-neutral-700 rounded-lg w-full text-left transition-colors text-sm font-medium'
                    onClick={() => navigate("/Admin/Settings")}
                  >
                    <Settings size={16} /> Settings
                  </button>
                  <button
                    className='flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 text-red-600 rounded-lg w-full text-left transition-colors text-sm font-medium'
                    onClick={handleLogout}
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className='absolute bottom-0 left-0 w-full h-[2px] overflow-hidden'>
        <motion.div
          className='h-full bg-red-600'
          style={{ width: `${progress}%` }}
        />
      </div>

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4'>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className='bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-5'
            >
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                <Shield size={24} />
              </div>
              <div>
                <h3 className='text-lg font-bold'>Sign Out</h3>
                <p className='text-sm text-neutral-500 mt-1'>Logout from Admin portal?</p>
              </div>
              <div className='flex gap-3 pt-2'>
                <button className="flex-1 px-4 py-2 rounded-xl border border-neutral-200" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                <button className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-bold" onClick={confirmLogout}>Logout</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default AdminHeader;
