import React, { useState } from "react";
import { Menu, X, Settings, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
  isBurgerActive: boolean;
}

const user = {
  name: "EduCompose",
  email: "EduCompose@gmail.com",
};

const Header: React.FC<HeaderProps> = ({ onMenuClick, isBurgerActive }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    navigate("/login");
  };

  const routeLabels: Record<string, string> = {
    "/Dashboard": "Dashboard",
    "/EssayManagement": "Essay Management",
    "/AnalysisReport": "Analysis Report",
    "/ClassInsights": "Class Insights",
    "/StudentProfile": "Student Profile",
    "/TeacherNotes": "Teacher Notes",
  };

  const currentLabel = routeLabels[location.pathname] || "Dashboard";

  return (
    <header className='flex justify-between items-center px-4 py-3 border-b bg-white shadow-sm'>
      <div className='flex items-center space-x-2'>
        <button
          onClick={onMenuClick}
          className='p-2 rounded-lg hover:bg-gray-100'
        >
          {isBurgerActive ? (
            <X className='w-6 h-6 text-gray-700' />
          ) : (
            <Menu className='w-6 h-6 text-gray-700' />
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
              <span className='text-lg font-semibold'>{currentLabel}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className='flex items-center space-x-3 relative'>
        <div
          className='flex items-center cursor-pointer ml-3 relative'
          onMouseEnter={() => setIsDropdownOpen(true)}
          onMouseLeave={() => setIsDropdownOpen(false)}
        >
          <div
            className='w-8 h-8 rounded-full border border-primary flex items-center justify-center bg-primary/20 text-sm font-semibold'
            title='User Profile'
          >
            {user.name[0]}
          </div>

          <svg
            className={`w-3 h-3 text-black ml-1 transition-transform ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='M19 9l-7 7-7-7'
            ></path>
          </svg>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className='absolute right-0 top-12 w-48 bg-white shadow-lg rounded-lg overflow-hidden z-50'
              >
                <div className='px-4 py-3 border-b border-gray-200'>
                  <p className='font-semibold text-gray-800'>{user.name}</p>
                  <p className='text-sm text-gray-500'>{user.email}</p>
                </div>

                <div className='flex flex-col'>
                  <button className='flex items-center gap-2 px-4 py-3 hover:bg-gray-100 text-gray-700 w-full'>
                    <Settings size={18} /> Settings
                  </button>
                  <button
                    className='flex items-center gap-2 px-4 py-3 hover:bg-gray-100 text-gray-700 w-full'
                    onClick={handleLogout}
                  >
                    <LogOut size={18} /> Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
