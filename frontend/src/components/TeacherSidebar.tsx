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
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

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
      setIsTablet(width >= 768 && width < 1024);
      if (width < 1024 && isSidebarOpen && !isTablet) {
        // Optionally auto-close on resize to mobile
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarOpen, setIsSidebarOpen, isTablet]);

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed lg:relative h-full z-[70] flex flex-col bg-primary border-r border-white/10 shadow-2xl transition-transform duration-300 ease-in-out
          ${!isDesktop ? (isSidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
        `}
        style={{
          width: isDesktop ? (isSidebarOpen ? "280px" : "80px") : "280px",
        }}
      >
        {/* Header / Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <img src={eduComposeLogo} alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-3 overflow-hidden"
            >
              <h1 className="text-white font-bold text-lg truncate">EduCompose</h1>
              <p className="text-white/60 text-[10px] truncate uppercase tracking-wider font-semibold">Teacher Portal</p>
            </motion.div>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 py-6 px-3 overflow-y-auto scrollbar-hide">
          <ul className="space-y-1.5">
            {menuItems.map((item) => {
              const active = isItemActive(item.path);
              return (
                <li key={item.label}>
                  <Tooltip content={item.label} position="right" disabled={isSidebarOpen}>
                    <button
                      onClick={() => handleItemClick(item.path)}
                      className={`w-full flex items-center h-12 rounded-xl transition-all duration-200 group ${
                        active 
                        ? "bg-white text-primary shadow-lg shadow-black/10" 
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                        {item.icon}
                      </div>
                      <AnimatePresence>
                        {isSidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="font-medium whitespace-nowrap overflow-hidden"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Desktop Toggle Button */}
        {isDesktop && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 bg-white text-primary border border-neutral-200 rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[80]"
          >
            {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        )}
      </aside>
    </>
  );
};

export default TeacherSidebar;
