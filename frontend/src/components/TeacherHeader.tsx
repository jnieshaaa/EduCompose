import React, { useEffect, useState } from "react";
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
import { supabase } from "../lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  fetchUserNotifications,
  markNotificationAsRead,
  subscribeToNotifications,
} from "../services/notificationService";
import { fetchTeacherUUID } from "../services/rubricService";
import type { Notification } from "../types/notification";

// Updated interface to include the user's role
interface TeacherHeaderProps {
  onMenuClick: () => void;
  isBurgerActive: boolean;
  role: "Admin" | "Teacher" | "Student"; // Added role prop
}

const TeacherHeader: React.FC<TeacherHeaderProps> = ({
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
  const [teacherProfile, setTeacherProfile] = useState<{
    title: string | null;
    nickname: string | null;
    email: string | null;
  } | null>(null);

  // Load and Subscribe to Notifications
  useEffect(() => {
    let channel: RealtimeChannel | undefined;

    const setupNotifications = async () => {
      const teacherUUID = await fetchTeacherUUID();
      if (teacherUUID) {
        // Initial fetch
        const fetchedNotifications = await fetchUserNotifications(teacherUUID);
        setNotifications(fetchedNotifications);

        // Subscribe to real-time
        channel = subscribeToNotifications(teacherUUID, (newNotif) => {
          setNotifications((prev) => [newNotif, ...prev]);
        });
      }
    };

    setupNotifications();

    return () => {
      if (channel) {
        // Assuming 'supabase' is imported or available globally
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Header identity should come from users table (not auth metadata)
  useEffect(() => {
    const loadTeacherProfile = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) return;

        const { data: dbUser } = await supabase
          .from("users")
          .select("title, nickname, email")
          .eq("auth_user_id", authData.user.id)
          .maybeSingle();

        if (dbUser) {
          setTeacherProfile({
            title: dbUser.title ?? null,
            nickname: dbUser.nickname ?? null,
            email: dbUser.email ?? null,
          });
        }
      } catch (err) {
        console.error("Failed to load teacher profile for header:", err);
      }
    };

    loadTeacherProfile();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );

    // Update in Supabase
    const teacherUUID = await fetchTeacherUUID();
    if (teacherUUID) {
      await markNotificationAsRead(id, teacherUUID);
    }
  };

  const routeLabels: Record<string, string> = {
    "/Teacher/Dashboard": "Dashboard",
    "/Teacher/Programs": "Class Management",
    "/Teacher/Sections": "Class Management",
    "/Teacher/Students": "Class Management",
    "/Teacher/Activities": "Activities",
    "/Teacher/CompareActivities": "Compare Essays",
    "/Teacher/Essays": "Essay Submissions",
    "/Teacher/EssayManagement": "Essay Management",
    "/Teacher/Rubrics": "Rubrics / Criteria",
    "/Teacher/Metrics": "Metrics",
    "/Teacher/Settings": "Settings",
    "/Teacher/Notifications": "Notifications",
    "/Teacher/AnalysisResults": "Analysis Results",
  };

  const currentLabel = routeLabels[location.pathname] || "Dashboard";

  // Animate progress bar
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
    navigate("/");
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Display only title + nickname from users table.
  const displayName = React.useMemo(() => {
    if (!teacherProfile) return "User";

    const title = (teacherProfile.title || "").trim();
    const nickname = (teacherProfile.nickname || "").trim();

    const capitalize = (s: string) =>
      s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

    if (title && nickname) {
      return `${capitalize(title)}. ${capitalize(nickname)}`;
    }
    if (nickname) {
      return capitalize(nickname);
    }
    return title ? capitalize(title) : "User";
  }, [teacherProfile]);

  // Generate initials from nickname or display name
  const userInitial = (teacherProfile?.nickname || displayName || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <header className="relative bg-white border-b border-neutral-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-40">
      {/* Left Section: Burger Menu and Current Page Label */}
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="text-neutral-500 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden mr-4"
          aria-label="Toggle menu"
        >
          {isBurgerActive ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-lg sm:text-xl font-semibold text-neutral-900">
          {currentLabel}
        </h1>
      </div>

      {/* Right Section: Notifications and User Profile */}
      <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0 relative">
        {/* Notification Dropdown */}
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          role="Teacher"
          onMarkAsRead={handleMarkAsRead}
        />

        {/* User Profile Container */}
        <div
          className="flex items-center cursor-pointer relative group"
          onMouseEnter={() => !isMobile && setIsDropdownOpen(true)}
          onMouseLeave={() => !isMobile && setIsDropdownOpen(false)}
          onClick={() => isMobile && setIsDropdownOpen(!isDropdownOpen)}
        >
          {/* User Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white text-lg font-bold flex-shrink-0 shadow-sm"
            title={displayName}
          >
            {userInitial}
          </div>

          <div className='hidden md:flex ml-3 flex-col text-left'>
            <p className='font-semibold text-sm text-neutral-900 whitespace-nowrap truncate max-w-[150px]'>{displayName}</p>
            <p className='text-[10px] uppercase tracking-wider font-bold text-neutral-400'>Teacher</p>
          </div>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute right-0 top-full pt-2 w-56 z-50"
              >
                <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-neutral-100 p-1">
                  <div className="px-4 py-3 border-b border-neutral-50 mb-1">
                    <p className="font-bold text-neutral-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {teacherProfile?.email || user?.email || ""}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <button
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 text-neutral-700 rounded-lg w-full text-left transition-colors text-sm font-medium"
                      onClick={() => {
                        navigate("/Teacher/Settings");
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Settings size={16} className="text-neutral-400" /> Settings
                    </button>
                    <button
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 text-red-600 rounded-lg w-full text-left transition-colors text-sm font-medium"
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
      <div className="absolute bottom-0 left-0 w-full h-[2px] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-50"
          style={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.1 }}
        />
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-rd shadow-xl p-4 sm:p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">
              Confirm Logout
            </h3>
            <p className="text-sm text-neutral-600">
              Are you sure you want to log out?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                className="px-4 py-2 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-100 transition-colors"
                onClick={cancelLogout}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-error-default text-white hover:bg-error-dark transition-colors"
                onClick={confirmLogout}
              >
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default TeacherHeader;
