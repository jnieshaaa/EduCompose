import React, { useEffect, useState } from "react";
import {
  Menu,
  X,
  Settings,
  LogOut,
  Search, // New: for the search bar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useLoader } from "./ui/LoaderContext";
import { useAuth } from "../contexts/AuthContext";
import { NotificationDropdown } from "./ui/NotificationDropdown";
import {
  fetchTeacherNotifications,
  markNotificationAsRead,
} from "../services/notificationService";
import { fetchTeacherId } from "../services/rubricService";
import type { Notification } from "../data/notificationsData";

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
  const [shineMount, setShineMount] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { loading } = useLoader();
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // New state for search input
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch notifications from Supabase
  useEffect(() => {
    const loadNotifications = async () => {
      const teacherId = await fetchTeacherId();
      if (teacherId) {
        const fetchedNotifications = await fetchTeacherNotifications(teacherId);
        setNotifications(fetchedNotifications);
      }
    };

    loadNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync search term with URL params
  useEffect(() => {
    const urlSearch = new URLSearchParams(location.search).get("search");
    if (urlSearch !== null) {
      setSearchTerm(urlSearch);
    } else if (searchTerm && !urlSearch) {
      // Clear search term if URL doesn't have search param
      setSearchTerm("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );

    // Update in Supabase
    const teacherId = await fetchTeacherId();
    if (teacherId) {
      await markNotificationAsRead(id, teacherId);
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
  };

  const currentLabel = routeLabels[location.pathname] || "Dashboard";

  useEffect(() => setShineMount(true), [location.pathname]);

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

  // Search functionality - updates URL params for pages that support it
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSearch = searchTerm.trim();
    const currentSearchParams = new URLSearchParams(location.search);

    // Pages that support search
    const searchablePages = [
      "/Teacher/Students",
      "/Teacher/Sections",
      "/Teacher/Programs",
      "/Teacher/Activities",
      "/Teacher/Rubrics",
      "/Teacher/EssayManagement",
    ];

    if (trimmedSearch) {
      // If on a searchable page, update URL with search param
      if (searchablePages.some((path) => location.pathname.startsWith(path))) {
        currentSearchParams.set("search", trimmedSearch);
        navigate(`${location.pathname}?${currentSearchParams.toString()}`, {
          replace: true,
        });
      } else {
        // If not on a searchable page, navigate to Students page with search
        navigate(
          `/Teacher/Students?search=${encodeURIComponent(trimmedSearch)}`,
        );
      }
    } else {
      // Clear search param if empty
      currentSearchParams.delete("search");
      const newUrl = currentSearchParams.toString()
        ? `${location.pathname}?${currentSearchParams.toString()}`
        : location.pathname;
      navigate(newUrl, { replace: true });
    }
  };

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Debounce: update URL after user stops typing (optional - can be removed for instant search)
    // For now, we'll update on submit only
  };

  // Format display name: Title. Nickname (e.g., "Sir. Pogi")
  const displayName = React.useMemo(() => {
    if (!user) return "User";

    const title = user.title;
    const nickname = user.nickname;

    const capitalize = (s: string) =>
      s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

    if (title && nickname) {
      return `${capitalize(title)}. ${capitalize(nickname)}`;
    }

    return nickname ? capitalize(nickname) : "User";
  }, [user]);

  // Generate initials from nickname or display name
  const userInitial = (user?.nickname || displayName || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <header className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 px-3 sm:px-4 py-3 border-b bg-white shadow-sm">
      {/* 1. Left Section: Menu Toggle and Current Label */}
      <div className="flex items-center space-x-2 flex-1 sm:flex-initial sm:w-auto min-w-0">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-rs hover:bg-neutral-300/30 transition-colors flex-shrink-0"
        >
          {isBurgerActive ? (
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-900" />
          ) : (
            <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-900" />
          )}
        </button>

        <AnimatePresence mode="wait">
          {!isBurgerActive && (
            <motion.div
              key={currentLabel}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-2 min-w-0"
            >
              <span className="relative text-base sm:text-lg bg-black bg-clip-text text-transparent font-semibold overflow-hidden group truncate">
                {currentLabel}
                <span
                  className={`absolute top-0 left-0 w-1/3 h-full bg-shine-gradient transform -translate-x-full z-20 ${
                    shineMount ? "animate-shine" : ""
                  } group-hover:animate-shine`}
                  onAnimationEnd={() => setShineMount(false)}
                />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Center Section: Search Bar */}
      <div className="flex justify-center w-full sm:w-auto sm:flex-1 sm:max-w-md order-3 sm:order-2">
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-9 px-8 pr-3 text-sm border border-neutral-300 rounded-md bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
        </form>
      </div>

      {/* 3. Right Section: Notifications and User Profile (Updated Design) */}
      <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0 order-2 sm:order-3 relative">
        {/* Notification Dropdown */}
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          role="Teacher"
          onMarkAsRead={handleMarkAsRead}
        />

        {/* User Profile Container (Updated Design) */}
        <div
          className="flex items-center cursor-pointer relative"
          onMouseEnter={() => !isMobile && setIsDropdownOpen(true)}
          onMouseLeave={() => !isMobile && setIsDropdownOpen(false)}
          onClick={() => isMobile && setIsDropdownOpen(!isDropdownOpen)}
        >
          {/* User Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white text-xl font-bold flex-shrink-0"
            title={displayName}
          >
            {userInitial}
          </div>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute right-0 top-full pt-2 w-48 sm:w-56 z-50"
              >
                <div className="bg-white shadow-lg rounded-rd overflow-hidden border border-neutral-200">
                  <div className="px-4 py-3 border-b border-neutral-300/30">
                    <p className="font-semibold text-neutral-900">
                      {displayName}
                    </p>
                    <p className="text-sm text-neutral-400">
                      {user?.email || ""}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <button
                      className="flex items-center gap-2 px-4 py-3 hover:bg-neutral-100 text-neutral-900 w-full text-left transition-colors"
                      onClick={() => {
                        navigate("/Teacher/Settings");
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Settings size={18} /> Settings
                    </button>
                    <button
                      className="flex items-center gap-2 px-4 py-3 hover:bg-neutral-100 text-neutral-900 w-full text-left transition-colors"
                      onClick={handleLogout}
                    >
                      <LogOut size={18} /> Logout
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
