import React, { useState, useEffect, useMemo } from "react";
import {
  Home,
  Layers,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Settings,
  GitCompare,
  Archive,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Tooltip from "./ui/Tooltip";
import eduComposeLogo from "../assets/EduCompose.png";

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface TeacherSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const TeacherSidebar: React.FC<TeacherSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
}) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        icon: <Home className="w-5 h-5" />,
        label: "Dashboard",
        path: "/Teacher/Dashboard",
      },
      {
        icon: <Layers className="w-5 h-5" />,
        label: "Course Management",
        path: "/Teacher/Courses",
      },
      {
        icon: <BookOpen className="w-5 h-5" />,
        label: "Activities",
        path: "/Teacher/Activities",
      },
      {
        icon: <GitCompare className="w-5 h-5" />,
        label: "Compare Essays",
        path: "/Teacher/CompareActivities",
      },
      {
        icon: <ClipboardCheck className="w-5 h-5" />,
        label: "Rubrics",
        path: "/Teacher/Rubrics",
      },
      {
        icon: <BarChart3 className="w-5 h-5" />,
        label: "Metrics",
        path: "/Teacher/Metrics",
      },
      {
        icon: <Archive className="w-5 h-5" />,
        label: "Archive",
        path: "/Teacher/Archive",
      },
      {
        icon: <Settings className="w-5 h-5" />,
        label: "Settings",
        path: "/Teacher/Settings",
      },
    ],
    [],
  );

  const courseManagementPaths = useMemo(
    () => ["/Teacher/Courses", "/Teacher/Sections", "/Teacher/Students"],
    [],
  );

  const [activePath, setActivePath] = useState(location.pathname);
  useEffect(() => setActivePath(location.pathname), [location.pathname]);

  const handleItemClick = (path: string) => {
    navigate(path);
    if (!isDesktop) setIsSidebarOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsDesktop(width >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isItemActive = (path: string) => {
    const current = activePath.toLowerCase();
    const target = path.toLowerCase();
    if (target === "/teacher/courses") {
      return courseManagementPaths.some(p => current.startsWith(p.toLowerCase()));
    }
    return current === target || current.startsWith(target + "/");
  };

  return (
    <>
      {/* Overlay Backdrop for Mobile */}
      <AnimatePresence>
        {!isDesktop && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
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
              <p className="text-white/40 text-[9px] uppercase tracking-[0.15em] font-bold truncate">Teacher Portal</p>
            </motion.div>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 py-4 px-2.5 overflow-y-auto scrollbar-hide">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const active = isItemActive(item.path);
              return (
                <li key={item.label}>
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

        {/* Help Link at Bottom */}
        <div className="p-3 border-t border-white/5">
          <Tooltip content="Help & Support" position="right" disabled={isSidebarOpen} className="block w-full">
            <button
              onClick={() => handleItemClick("/Teacher/Help")}
              className={`w-full flex items-center h-10 rounded-xl transition-all duration-200 group ${
                isSidebarOpen ? "px-0" : "justify-center"
              } ${
                activePath.toLowerCase() === "/teacher/help"
                ? "bg-white text-primary shadow-sm"
                : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className={`${isSidebarOpen ? "w-11" : "w-10"} h-10 flex items-center justify-center flex-shrink-0`}>
                <HelpCircle className="w-4.5 h-4.5" />
              </div>
              {isSidebarOpen && (
                <span className="text-xs font-bold whitespace-nowrap overflow-hidden">
                  Help Center
                </span>
              )}
            </button>
          </Tooltip>
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

export default TeacherSidebar;
