import React, { useState, useEffect, useMemo } from "react";
import {
  Home,
  // FileText,
  Layers,
  Info,
  BookOpen,
  Target,
  Zap,
  Shield,
  ClipboardCheck,
  BarChart3,
  Settings,
  GitCompare,
  Archive,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Tooltip from "./ui/Tooltip";
import Modal from "./ui/Modal";
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
  const [logoShine, setLogoShine] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // All menu items (flat structure - no sub-menus)
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
      // {
      //   icon: <GitCompare className="w-5 h-5" />,
      //   label: "Blocks / sections",
      //   path: "/Teacher/Sections",
      // },
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
        label: "Rubrics / Criteria",
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

  // Routes that belong to Course Management section (for highlighting)
  const courseManagementPaths = useMemo(
    () => ["/Teacher/Courses", "/Teacher/Sections", "/Teacher/Students"],
    [],
  );

  const [activePath, setActivePath] = useState(location.pathname);

  useEffect(() => setActivePath(location.pathname), [location.pathname]);

  const handleItemClick = (path: string) => {
    navigate(path);
  };

  useEffect(() => {
    const currentItem = menuItems.find(
      (item) => item.path.toLowerCase() === location.pathname.toLowerCase(),
    );

    // For Course Management sub-routes, show "Course Management" in title
    const isCourseManagementRoute = courseManagementPaths.some((p) =>
      location.pathname.toLowerCase().startsWith(p.toLowerCase()),
    );

    if (isCourseManagementRoute) {
      document.title = "Course Management";
    } else {
      document.title = currentItem ? currentItem.label : "EduCompose";
    }
  }, [location.pathname, menuItems, courseManagementPaths]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsDesktop(width >= 1024);
      if (width < 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setIsSidebarOpen]);

  useEffect(() => {
    setLogoShine(true);
    const timeout = setTimeout(() => setLogoShine(false), 1000);
    return () => clearTimeout(timeout);
  }, []);

  const textVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  // Check if a menu item is active (including Course Management sub-routes)
  const isItemActive = (itemPath: string) => {
    const currentPath = activePath.toLowerCase();
    const targetPath = itemPath.toLowerCase();

    // For Course Management, check if current path is any of its sub-routes
    if (targetPath === "/teacher/courses") {
      return courseManagementPaths.some((p) =>
        currentPath.startsWith(p.toLowerCase()),
      );
    }

    return (
      currentPath === targetPath || currentPath.startsWith(targetPath + "/")
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className="fixed lg:relative h-full z-40 flex flex-col border-r border-neutral3 bg-primary"
        style={{
          width: isSidebarOpen ? "280px" : isDesktop ? "80px" : "0px",
          transition: "width 0.2s",
          overflow: isSidebarOpen ? "hidden" : "visible",
        }}
      >
        {/* Header */}
        <div className="flex items-center h-16 border-b border-white p-2.5 relative">
          <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden flex items-center justify-center group">
            <img
              src={eduComposeLogo}
              alt="EduCompose Logo"
              className="w-full h-full object-cover cursor-none"
            />
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                className={`absolute top-0 left-0 w-1/3 h-full bg-shine-gradient transform -translate-x-full z-20
                    ${
                      logoShine ? "animate-shine" : ""
                    } group-hover:animate-shine`}
                onAnimationEnd={() => setLogoShine(false)}
              ></div>
            </div>
          </div>

          {isSidebarOpen && (
            <div className="ml-2 sm:ml-3 flex flex-col overflow-hidden flex-1 min-w-0">
              <AnimatePresence>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={textVariants}
                  className="flex flex-col min-w-0"
                >
                  <h1 className="font-bold text-lg sm:text-xl md:text-2xl text-white whitespace-nowrap truncate">
                    EduCompose
                  </h1>
                  <p className="text-[10px] sm:text-xxs font-md mt-0.5 text-white whitespace-nowrap truncate">
                    Teacher's Companion for Essay Evaluation
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul
            className="space-y-2"
            style={{ overflow: isSidebarOpen ? "hidden" : "visible" }}
          >
            {menuItems.map((item) => {
              const isActive = isItemActive(item.path);
              return (
                <li key={item.label} className="w-full">
                  <Tooltip
                    content={item.label}
                    position="right"
                    delay={200}
                    disabled={isSidebarOpen}
                  >
                    <button
                      onClick={() => handleItemClick(item.path)}
                      className={`btn-fade group flex items-center rounded-rd h-10 px-3 ${
                        isActive
                          ? "bg-neutral-50 text-primary"
                          : "bg-primary text-white hover:bg-primary-600 focus:bg-primary-600 hover:text-support-superlight focus:text-support-superlight"
                      }`}
                      style={{ width: isSidebarOpen ? "248px" : "48px" }}
                    >
                      <span className="flex-shrink-0 flex items-center justify-center w-10 h-10">
                        {item.icon}
                      </span>
                      <AnimatePresence>
                        {isSidebarOpen && (
                          <motion.span
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={textVariants}
                            className="font-medium text-sm whitespace-nowrap ml-2"
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

        {/* Info Tab at Bottom */}
        <div className="p-4 border-t border-white">
          <Tooltip
            content="About EduCompose"
            position="right"
            delay={200}
            disabled={isSidebarOpen}
          >
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="btn-fade group flex items-center rounded-rd h-10 px-3 bg-primary text-white hover:bg-primary-600 focus:bg-primary-600 hover:text-support-superlight focus:text-support-superlight"
              style={{ width: isSidebarOpen ? "248px" : "48px" }}
            >
              <span className="flex-shrink-0 flex items-center justify-center w-10 h-10">
                <Info className="w-5 h-5" />
              </span>
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.span
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={textVariants}
                    className="font-medium text-sm whitespace-nowrap ml-2"
                  >
                    About EduCompose
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {!isDesktop && isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Info Modal */}
      <Modal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        title="About EduCompose"
        size="lg"
      >
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-primary to-primary-500 rounded-rd p-6 text-white">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-rd flex items-center justify-center">
                <img
                  src={eduComposeLogo}
                  alt="EduCompose Logo"
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold">EduCompose</h3>
                <p className="text-white text-opacity-90">
                  Teacher's Companion for Essay Evaluation
                </p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-neutral-100 rounded-rd p-4 border border-neutral-300">
              <div className="flex items-center space-x-3 mb-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <h4 className="font-semibold text-neutral-900">
                  Essay Management
                </h4>
              </div>
              <p className="text-sm text-neutral-600">
                Streamline essay collection, organization, and grading with our
                intuitive management system.
              </p>
            </div>

            <div className="bg-neutral-100 rounded-rd p-4 border border-neutral-300">
              <div className="flex items-center space-x-3 mb-2">
                <Target className="w-6 h-6 text-primary" />
                <h4 className="font-semibold text-neutral-900">
                  Smart Analytics
                </h4>
              </div>
              <p className="text-sm text-neutral-600">
                Get detailed insights into student performance and writing
                patterns with advanced analytics.
              </p>
            </div>

            <div className="bg-neutral-100 rounded-rd p-4 border border-neutral-300">
              <div className="flex items-center space-x-3 mb-2">
                <Zap className="w-6 h-6 text-primary" />
                <h4 className="font-semibold text-neutral-900">
                  Quick Grading
                </h4>
              </div>
              <p className="text-sm text-neutral-600">
                Accelerate your grading process with automated tools and
                customizable rubrics.
              </p>
            </div>

            <div className="bg-neutral-100 rounded-rd p-4 border border-neutral-300">
              <div className="flex items-center space-x-3 mb-2">
                <Shield className="w-6 h-6 text-primary" />
                <h4 className="font-semibold text-neutral-900">
                  Secure Platform
                </h4>
              </div>
              <p className="text-sm text-neutral-600">
                Your data and student information are protected with
                enterprise-grade security.
              </p>
            </div>
          </div>

          {/* Version Info */}
          <div className="bg-neutral-200 rounded-rd p-4 border border-neutral-300">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  Version 1.0.0
                </p>
                <p className="text-xs text-neutral-600">
                  Last updated: December 2024
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-600">
                  Made with ❤️ for educators
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeacherSidebar;
