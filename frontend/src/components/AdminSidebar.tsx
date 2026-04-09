import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Home,
  Settings,
  ClipboardCheck,
  BookOpen,
  Info,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Archive,
  UserCog,
  School,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import Modal from "./ui/Modal";
import eduComposeLogo from "../assets/EduCompose.png";
import Tooltip from "./ui/Tooltip";

interface AdminSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
}) => {
  const { user, logout } = useAuth();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [logoShine, setLogoShine] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Close menu when clicking outside
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsDesktop(width >= 1024);
      setIsTablet(width >= 768 && width < 1024);
      if (width < 768 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarOpen, setIsSidebarOpen]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      logout();
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const menuItems = useMemo(
    () => [
      {
        icon: <Home className="w-5 h-5" />,
        label: "Dashboard",
        path: "/Admin/Dashboard",
      },
      {
        icon: <UserCog className="w-5 h-5" />,
        label: "User Management",
        path: "/Admin/Users",
      },
      {
        icon: <GraduationCap className="w-5 h-5" />,
        label: "Students",
        path: "/Admin/Students",
      },
      {
        icon: <School className="w-5 h-5" />,
        label: "Academics",
        path: "/Admin/Schools",
      },
      {
        icon: <ClipboardCheck className="w-5 h-5" />,
        label: "Platform Rubrics",
        path: "/Admin/Rubrics",
      },
      {
        icon: <BookOpen className="w-5 h-5" />,
        label: "Content Management",
        path: "/Admin/Content",
      },
      {
        icon: <Archive className="w-5 h-5" />,
        label: "Archive Records",
        path: "/Admin/Archive",
      },
      {
        icon: <Settings className="w-5 h-5" />,
        label: "Settings",
        path: "/Admin/Settings",
      },
    ],
    [],
  );

  const isItemActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const handleItemClick = (path: string) => {
    navigate(path);
    if (!isDesktop) setIsSidebarOpen(false);
  };

  const textVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  return (
    <>
      <AnimatePresence>
        {!isDesktop && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden'
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: isSidebarOpen ? (isTablet ? "240px" : "280px") : (isDesktop ? "80px" : "0px"),
          x: (!isDesktop && !isSidebarOpen) ? -280 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed lg:relative h-full flex flex-col bg-primary border-r border-white/10 text-white z-50 shadow-2xl lg:shadow-none overflow-visible"
      >
        {/* Header */}
        <div className="flex items-center h-16 border-b border-white/10 p-2.5 relative flex-shrink-0">
          <div
            className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/5 p-1 cursor-pointer ml-1.5"
            onMouseEnter={() => setLogoShine(true)}
          >
            <img
              src={eduComposeLogo}
              alt="Logo"
              className="w-full h-full object-contain"
            />
            <div
              className={`absolute top-0 left-0 w-full h-full bg-shine-gradient transform -translate-x-full ${logoShine ? "animate-shine" : ""}`}
              onAnimationEnd={() => setLogoShine(false)}
            />
          </div>
          {isSidebarOpen && (
            <AnimatePresence>
              <motion.div 
                initial="hidden" animate="visible" exit="hidden" variants={textVariants}
                className="ml-3 min-w-0"
              >
                <h1 className="font-bold text-lg text-white truncate whitespace-nowrap">EduCompose</h1>
                <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Admin Portal</p>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 overflow-y-auto scrollbar-hide">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Tooltip content={item.label} position="right" delay={200} disabled={isSidebarOpen}>
                  <button
                    onClick={() => handleItemClick(item.path)}
                    className={`group w-full flex items-center rounded-xl transition-all duration-200 ${
                      isSidebarOpen ? "px-4 py-3" : "justify-center w-12 h-12 mx-auto"
                    } ${isItemActive(item.path) ? "bg-white text-primary shadow-md" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                  >
                    <span className="flex-shrink-0 flex items-center justify-center">
                      {item.icon}
                    </span>
                    {isSidebarOpen && (
                      <motion.span 
                        initial="hidden" animate="visible" exit="hidden" variants={textVariants}
                        className="font-medium text-sm truncate ml-3"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-white/10 relative" ref={menuRef}>
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-xl border border-neutral-100 overflow-hidden py-1 z-50">
              <button onClick={() => { setIsInfoModalOpen(true); setIsUserMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-50"><Info size={16} /> About Platform</button>
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50"><LogOut size={16} /> Sign Out</button>
            </div>
          )}
          <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className={`w-full flex items-center ${isSidebarOpen ? "gap-3 px-3" : "justify-center"} py-2 rounded-xl hover:bg-white/5`}>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">
              {user?.full_name.charAt(0) || "A"}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-bold truncate">{user?.full_name || "Admin"}</p>
                <p className="text-[9px] text-white/50 truncate uppercase tracking-widest">Administrator</p>
              </div>
            )}
          </button>
        </div>

        {/* Toggle Button */}
        {(isDesktop || isTablet) && (
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="absolute top-1/2 -right-4 -translate-y-1/2 z-50 flex items-center justify-center w-8 h-8 bg-white text-primary border border-neutral-200 shadow-md hover:bg-neutral-50 transition-colors rounded-full"
          >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
      </motion.aside>

      <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="About EduCompose">
        <p className="text-neutral-600">EduCompose v1.0.0 — Empowering educators through intelligent essay evaluation.</p>
      </Modal>
    </>
  );
};

export default AdminSidebar;
