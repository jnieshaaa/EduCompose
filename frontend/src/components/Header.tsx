import React, { useState } from "react";
import eduComposeLogo from "../assets/EduCompose.png";
import { Menu, Settings, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
}

const user = {
  name: "EduCompose",
  email: "EduCompose@gmail.com",
};

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    // 1. logout logic
    // 2. Login route
    navigate("/login");
  };

  return (
    <header className='flex justify-between items-center px-4 py-3 border-b bg-white shadow-sm'>
      {/* Left Section */}
      <div
        className='flex items-center space-x-2 cursor-pointer'
        onClick={onMenuClick}
      >
        <Menu className='w-6 h-6 text-gray-700 lg:hidden' />
        <div className='flex items-center space-x-2'>
          <div className='w-8 h-8 rounded overflow-hidden flex items-center justify-center'>
            <img
              src={eduComposeLogo}
              alt='Logo'
              className='w-full h-full object-cover'
            />
          </div>
          <span className='text-lg font-bold'>
            <span className='text-gray-500'>Edu</span>
            <span className='text-primary'>Compose</span>
          </span>
        </div>
      </div>

      {/* Right Section */}
      <div className='flex items-center space-x-3 relative'>
        {/* Notification */}
        <button aria-label='Notifications'>
          <svg
            className='w-6 h-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6.096 8.354 6.096 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
            ></path>
          </svg>
        </button>

        {/* User Avatar + Dropdown */}
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

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className='absolute right-0 top-12 w-48 bg-white shadow-lg rounded-lg overflow-hidden z-50'
              >
                {/* User Info */}
                <div className='px-4 py-3 border-b border-gray-200'>
                  <p className='font-semibold text-gray-800'>{user.name}</p>
                  <p className='text-sm text-gray-500'>{user.email}</p>
                </div>

                {/* Menu Items */}
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
