import React, { useEffect, useState } from "react";
import {
  Menu,
  X,
  Settings,
  LogOut,
  Bell, // New: for notifications
  Search, // New: for the search bar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useLoader } from "./ui/LoaderContext";
import { useAuth } from "../contexts/AuthContext";

// Updated interface to include the user's role
interface StudentHeaderProps {
  onMenuClick: () => void;
  isBurgerActive: boolean;
  role: "Teacher" | "Student"; // Role prop remains for display
}

// Renamed component
const StudentHeader: React.FC<StudentHeaderProps> = ({
  onMenuClick,
  isBurgerActive,
  role, // Destructured role prop
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [shineMount, setShineMount] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { loading } = useLoader();
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  // New state for search input
  const [searchTerm, setSearchTerm] = useState("");

  // Updated route labels for Student paths
  const routeLabels: Record<string, string> = {
    "/Student/Dashboard": "Dashboard",
    "/Student/Submit": "Submit Essay",
    "/Student/Essays": "My Essays",
    "/Student/Feedback": "AI Feedback",
    "/Student/Progress": "Progress & Analytics",
    "/Student/Rubric": "Rubric / Criteria",
    "/Student/Notifications": "Notifications",
    "/Student/Settings": "Settings",
  };

  const currentLabel = routeLabels[location.pathname] || "Dashboard";

  useEffect(() => setShineMount(true), [location.pathname]);

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
    navigate("/");
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Placeholder for search functionality
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      console.log("Searching for:", searchTerm);
      // Implement actual search logic here (e.g., navigate to a search results page)
    }
  };

  const userName = user?.full_name || user?.username || "Student";
  const userInitial = userName[0].toUpperCase();

  return (
    <header className='relative flex justify-between items-center px-4 py-3 border-b bg-white shadow-sm'>
      
      {/* 1. Left Section: Menu Toggle and Current Label */}
      <div className='flex items-center space-x-2 w-1/4'>
        <button
          onClick={onMenuClick}
          className='p-2 rounded-rs hover:bg-neutral-300/30 transition-colors'
        >
          {isBurgerActive ? (
            <X className='w-6 h-6 text-neutral-900' />
          ) : (
            <Menu className='w-6 h-6 text-neutral-900' />
          )}
        </button>

        <AnimatePresence mode='wait'>
          {!isBurgerActive && (
            <motion.div
              key={currentLabel}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className='flex items-center space-x-2'
            >
              <span className='relative text-lg bg-black bg-clip-text text-transparent font-semibold overflow-hidden group'>
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
      <div className='flex justify-center w-1/2'>
        <form onSubmit={handleSearch} className='relative w-full max-w-lg'>
          <input
            type='text'
            // Updated placeholder for students
            placeholder='Search your essays, feedback, or rubrics...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full py-2 pl-10 pr-4 border border-neutral-300 rounded-lg text-sm focus:border-primary focus:ring-primary transition-all'
          />
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500' />
        </form>
      </div>

      {/* 3. Right Section: Notifications and User Profile (Updated Design) */}
      <div className='flex items-center space-x-4 w-1/4 justify-end relative'>
        {/* Notification Bell */}
        <button className='p-2 rounded-full hover:bg-neutral-300/30 transition-colors relative'>
          <Bell className='w-6 h-6 text-neutral-900' />
        </button>

        {/* User Profile Container (Updated Design) */}
        <div
          className='flex items-center cursor-pointer relative'
          onMouseEnter={() => setIsDropdownOpen(true)}
          onMouseLeave={() => setIsDropdownOpen(false)}
        >
          {/* User Avatar */}
          <div
            className='w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white text-xl font-bold flex-shrink-0'
            title={userName}
          >
            {userInitial}
          </div>

          {/* User Name and Role (New design) */}
          <div className='ml-3 flex flex-col text-left'>
            <p className='font-semibold text-lg text-neutral-900 whitespace-nowrap'>{userName}</p>
            {/* Display role from props */}
            <p className='text-sm text-neutral-500 whitespace-nowrap'>{role}</p>
          </div>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className='absolute right-0 top-full pt-2 w-48 z-50'
              >
                <div className='bg-white shadow-lg rounded-rd overflow-hidden border border-neutral-200'>
                  <div className='px-4 py-3 border-b border-neutral-300/30'>
                    <p className='font-semibold text-neutral-900'>
                      {userName}
                    </p>
                    <p className='text-sm text-neutral-400'>
                      {user?.email || ""}
                    </p>
                  </div>
                  <div className='flex flex-col'>
                    <button
                      className='flex items-center gap-2 px-4 py-3 hover:bg-neutral-100 text-neutral-900 w-full text-left transition-colors'
                      onClick={() => {
                        navigate("/Student/Settings"); // Adjusted path for student
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Settings size={18} /> Settings
                    </button>
                    <button
                      className='flex items-center gap-2 px-4 py-3 hover:bg-neutral-100 text-neutral-900 w-full text-left transition-colors'
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

      {/* Top progress bar (Same logic) */}
      <div className='absolute bottom-0 left-0 w-full h-[2px] rounded-full overflow-hidden'>
        <motion.div
          className='h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-50'
          style={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.1 }}
        />
      </div>

      {/* Logout Confirmation Modal (Same logic) */}
      {showLogoutConfirm && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-rd shadow-xl p-6 w-full max-w-sm space-y-4'>
            <h3 className='text-lg font-semibold text-neutral-900'>
              Confirm Logout
            </h3>
            <p className='text-sm text-neutral-600'>
              Are you sure you want to log out?
            </p>
            <div className='flex justify-end gap-3 pt-2'>
              <button
                className='px-4 py-2 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-100 transition-colors'
                onClick={cancelLogout}
              >
                Cancel
              </button>
              <button
                className='px-4 py-2 rounded-md bg-error-default text-white hover:bg-error-dark transition-colors'
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

export default StudentHeader;