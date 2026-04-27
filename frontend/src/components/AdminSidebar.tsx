import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Home,
  Settings,
  ClipboardCheck,
  BookOpen,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  School,
  HelpCircle,
  Briefcase,
  Shield,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

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
      if (width < 768 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarOpen]);

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
        icon: <Shield className="w-5 h-5" />,
        label: "Admins",
        path: "/Admin/Users",
      },
      {
        icon: <Briefcase className="w-5 h-5" />,
        label: "Teachers",
        path: "/Admin/Teachers",
      },
      {
        icon: <GraduationCap className="w-5 h-5" />,
        label: "Students",
        path: "/Admin/Students",
      },
      {
        icon: <School className="w-5 h-5" />,
        label: "Programs",
        path: "/Admin/Schools",
      },
      {
        icon: <ClipboardCheck className="w-5 h-5" />,
        label: "Rubrics",
        path: "/Admin/Rubrics",
      },
      /* {
        icon: <BookOpen className="w-5 h-5" />,
        label: "Classes",
        path: "/Admin/Content",
      }, */
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

  return (
    <>
      <AnimatePresence>
        {!isDesktop && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden'
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed lg:relative h-full z-[70] flex flex-col bg-primary border-r border-white/5 shadow-2xl transition-transform duration-300 ease-in-out
          ${!isDesktop ? (isSidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
        `}
        style={{
          width: isDesktop ? (isSidebarOpen ? "260px" : "72px") : "260px",
        }}
      >
        {/* Header / Logo */}
        <div className="h-14 flex items-center px-4 border-b border-white/5">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <img src={eduComposeLogo} alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-3 overflow-hidden"
            >
              <h1 className="text-white font-bold text-sm tracking-tight truncate">EduCompose</h1>
              <p className="text-white/40 text-[9px] uppercase tracking-[0.15em] font-bold truncate">Admin Portal</p>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2.5 overflow-y-auto scrollbar-hide">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const active = isItemActive(item.path);
              return (
                <li key={item.path}>
                  <Tooltip content={item.label} position="right" disabled={isSidebarOpen} className="block w-full">
                    <button
                      onClick={() => handleItemClick(item.path)}
                      className={`w-full flex items-center h-10 rounded-xl transition-all duration-200 group relative ${
                        isSidebarOpen ? "px-0" : "justify-center"
                      } ${
                        active 
                        ? "bg-white text-primary shadow-sm" 
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className={`${isSidebarOpen ? "w-11" : "w-10"} h-10 flex items-center justify-center flex-shrink-0`}>
                        {React.cloneElement(item.icon as React.ReactElement<any>, { className: "w-4.5 h-4.5" })}
                      </div>
                      <AnimatePresence initial={false}>
                        {isSidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            className="text-xs font-bold whitespace-nowrap overflow-hidden"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {active && !isSidebarOpen && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-white rounded-full" />
                      )}
                    </button>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-white/5 relative" ref={menuRef}>
          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-xl border border-neutral-100 overflow-hidden py-1 z-50 shadow-black/10"
              >
                <button onClick={() => { handleItemClick("/Admin/Help"); setIsUserMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-50 transition-colors">
                  <HelpCircle size={14} className="text-neutral-400" /> Help
                </button>
                <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-error-default hover:bg-error-default/5 transition-colors">
                  <LogOut size={14} /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} 
            className={`w-full flex items-center ${isSidebarOpen ? "gap-3 px-2.5" : "justify-center"} py-2.5 rounded-2xl hover:bg-white/10 transition-all duration-300 group`}
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-xs shrink-0 text-white shadow-lg border border-white/5 group-hover:scale-110 transition-transform">
              {(user?.first_name || "A").charAt(0).toUpperCase()}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 text-left min-w-0 animate-in fade-in slide-in-from-left-1">
                <p className="text-[11px] font-black text-white truncate tracking-tight">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : "Admin"}
                </p>
                <p className="text-[9px] text-white/40 truncate uppercase tracking-[0.15em] font-bold mt-0.5">Admin</p>
              </div>
            )}
          </button>
        </div>

        {/* Desktop Toggle Button */}
        {isDesktop && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 bg-white text-primary border border-neutral-100 rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[80] group"
          >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
      </aside>
    </>
  );
};

export default AdminSidebar;
