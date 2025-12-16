import React, { useState, useEffect, useMemo } from "react";
import {
  Home,
  FileText,
  Layers,
  // BarChart3,
  // Users,
  // GraduationCap,
  // ClipboardList,
  // Award,
  Info,
  BookOpen,
  Target,
  Zap,
  Shield,
  // LayoutDashboard,
  Users,
  ClipboardCheck,
  BarChart3,
  Settings,
  ChevronDown,
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
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [logoShine, setLogoShine] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Class Management sub-items: Programs, Blocks/Sections, Students
  const classManagementItems: MenuItem[] = useMemo(
    () => [
      {
        icon: <BookOpen className='w-4 h-4' />,
        label: "Programs",
        path: "/Teacher/Programs",
      },
      {
        icon: <Layers className='w-4 h-4' />,
        label: "Blocks / Sections",
        path: "/Teacher/Sections",
      },
      {
        icon: <Users className='w-4 h-4' />,
        label: "Students",
        path: "/Teacher/Students",
      },
    ],
    []
  );

  // Other top-level navigation items
  const otherMenuItems: MenuItem[] = useMemo(
    () => [
      {
        icon: <Home className='w-5 h-5' />,
        label: "Dashboard",
        path: "/Teacher/Dashboard",
      },
      {
        icon: <FileText className='w-5 h-5' />,
        label: "Essay Submissions",
        path: "/Teacher/Essays",
      },
      {
        icon: <BookOpen className='w-5 h-5' />,
        label: "Essay Management",
        path: "/Teacher/EssayManagement",
      },
      {
        icon: <ClipboardCheck className='w-5 h-5' />,
        label: "Rubrics / Criteria",
        path: "/Teacher/Rubrics",
      },
      {
        icon: <BarChart3 className='w-5 h-5' />,
        label: "Metrics",
        path: "/Teacher/Metrics",
      },
      {
        icon: <Settings className='w-5 h-5' />,
        label: "Settings",
        path: "/Teacher/Settings",
      },
    ],
    []
  );

  const allMenuItems: MenuItem[] = useMemo(
    () => [...classManagementItems, ...otherMenuItems],
    [classManagementItems, otherMenuItems]
  );

  const [activePath, setActivePath] = useState(location.pathname);
  const [isClassManagementOpen, setIsClassManagementOpen] = useState(false);

  const isClassManagementRoute = useMemo(
    () =>
      classManagementItems.some((item) =>
        activePath.toLowerCase().startsWith(item.path.toLowerCase())
      ),
    [activePath, classManagementItems]
  );

  useEffect(() => setActivePath(location.pathname), [location.pathname]);

  const handleItemClick = (path: string) => {
    // Only navigate; do not auto-close sidebar. It should only be
    // controlled by the burger icon in the parent layout.
    navigate(path);
  };

  useEffect(() => {
    const currentItem = allMenuItems.find(
      (item) => item.path.toLowerCase() === location.pathname.toLowerCase()
    );
    document.title = currentItem ? currentItem.label : "EduCompose";
  }, [location.pathname, allMenuItems]);

  // Automatically open Class Management dropdown when one of its routes is active
  useEffect(() => {
    if (isClassManagementRoute) {
      setIsClassManagementOpen(true);
    }
  }, [isClassManagementRoute]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsDesktop(width >= 1024);
      setIsTablet(width >= 768 && width < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setLogoShine(true);
    const timeout = setTimeout(() => setLogoShine(false), 1000);
    return () => clearTimeout(timeout);
  }, []);

  const textVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className='flex h-screen overflow-hidden'>
      <aside
        className='fixed lg:relative h-full z-40 flex flex-col border-r border-neutral3 bg-primary'
        style={{
          width: isSidebarOpen ? (isTablet ? "240px" : "280px") : isDesktop ? "80px" : "0px",
          transition: "width 0.2s",
          overflow: isSidebarOpen ? "hidden" : "visible",
        }}
      >
        {/* Header */}
        <div className='flex items-center h-16 border-b border-white p-2.5 relative'>
            {/* 👇 CHANGE 1: Logo container size reduced from w-14 h-14 (56px) to w-10 h-10 (40px) */}
            <div className='relative w-10 h-10 flex-shrink-0 rounded overflow-hidden flex items-center justify-center group'>
              <img
                src={eduComposeLogo}
                alt='EduCompose Logo'
                className='w-full h-full object-cover cursor-none'
              />
              <div className='absolute inset-0 pointer-events-none overflow-hidden'>
                <div
                  className={`absolute top-0 left-0 w-1/3 h-full bg-shine-gradient transform -translate-x-full z-20
                    ${logoShine ? "animate-shine" : ""} group-hover:animate-shine`}
                  onAnimationEnd={() => setLogoShine(false)}
                ></div>
              </div>
            </div>

            {isSidebarOpen && (
              <div className='ml-2 sm:ml-3 flex flex-col overflow-hidden flex-1 min-w-0'>
                <AnimatePresence>
                  <motion.div
                    initial='hidden'
                    animate='visible'
                    exit='hidden'
                    variants={textVariants}
                    className='flex flex-col min-w-0'
                  >
                    <h1 className='font-bold text-lg sm:text-xl md:text-2xl text-white whitespace-nowrap truncate'>
                      EduCompose
                    </h1>
                    <p className='text-[10px] sm:text-xxs font-md mt-0.5 text-white whitespace-nowrap truncate'>
                      Teacher's Companion for Essay Evaluation
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>

        {/* Navigation */}
        <nav className='flex-1 p-4'>
          <ul
            className='space-y-2'
            style={{ overflow: isSidebarOpen ? "hidden" : "visible" }}
          >
            {/* Dashboard (top-level item) */}
            {otherMenuItems
              .filter((item) => item.label === "Dashboard")
              .map((item) => {
                const isActive =
                  activePath.toLowerCase() === item.path.toLowerCase() ||
                  activePath
                    .toLowerCase()
                    .startsWith(item.path.toLowerCase() + "/");
                return (
                  <li key={item.label} className='w-full'>
                    <Tooltip
                      content={item.label}
                      position='right'
                      delay={200}
                      disabled={isSidebarOpen}
                    >
                      <button
                        onClick={() => handleItemClick(item.path)}
                        className={`btn-fade group w-full flex items-center rounded-rd ${
                          isActive
                            ? "bg-neutral-50 text-primary"
                            : "bg-primary text-white hover:text-support-superlight"
                        }`}
                      >
                        <div className='flex items-center w-full flex-1'>
                          <span className='flex-shrink-0 flex items-center justify-center w-12 h-12'>
                            {item.icon}
                          </span>
                          <AnimatePresence>
                            {isSidebarOpen && (
                              <motion.span
                                initial='hidden'
                                animate='visible'
                                exit='hidden'
                                variants={textVariants}
                                className='font-medium whitespace-nowrap flex-1 pr-4 text-left'
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </button>
                    </Tooltip>
                  </li>
                );
              })}

            {/* Class Management parent item with dropdown children */}
            <li className='w-full'>
              <Tooltip
                content='Class Management'
                position='right'
                delay={200}
                disabled={isSidebarOpen}
              >
                <button
                  onClick={() => {
                    setIsClassManagementOpen((prev) => !prev);
                    // Navigate to default sub-route (Programs)
                    handleItemClick("/Teacher/Programs");
                  }}
                  className={`btn-fade group w-full flex items-center rounded-rd ${
                    isClassManagementRoute
                      ? "bg-neutral-50 text-primary"
                      : "bg-primary text-white hover:text-support-superlight"
                  }`}
                >
                  <div className='flex items-center w-full flex-1'>
                    <span className='flex-shrink-0 flex items-center justify-center w-12 h-12'>
                      <Layers className='w-5 h-5' />
                    </span>
                    <AnimatePresence>
                      {isSidebarOpen && (
                        <motion.span
                          initial='hidden'
                          animate='visible'
                          exit='hidden'
                          variants={textVariants}
                          className='font-medium whitespace-nowrap flex-1 pr-2 text-left flex items-center justify-between'
                        >
                          <span>Class Management</span>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ml-2 ${
                              isClassManagementOpen ? "rotate-180" : ""
                            }`}
                          />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              </Tooltip>

              {/* Class Management sub-menu */}
              <AnimatePresence initial={false}>
                {isSidebarOpen && isClassManagementOpen && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className='mt-1 ml-12 space-y-1 overflow-hidden'
                  >
                    {classManagementItems.map((item) => {
                      const isActive =
                        activePath.toLowerCase() === item.path.toLowerCase() ||
                        activePath
                          .toLowerCase()
                          .startsWith(item.path.toLowerCase() + "/");
                      return (
                        <li key={item.label} className='w-full'>
                          <button
                            onClick={() => handleItemClick(item.path)}
                            className={`btn-fade group w-full flex items-center rounded-rd text-sm ${
                              isActive
                                ? "bg-neutral-50 text-primary"
                                : "bg-primary text-white hover:text-support-superlight"
                            }`}
                          >
                            <div className='flex items-center w-full flex-1'>
                              <span className='flex-shrink-0 flex items-center justify-center w-8 h-8'>
                                {item.icon}
                              </span>
                              <AnimatePresence>
                                {isSidebarOpen && (
                                  <motion.span
                                    initial='hidden'
                                    animate='visible'
                                    exit='hidden'
                                    variants={textVariants}
                                    className='font-medium whitespace-nowrap flex-1 pr-4 text-left'
                                  >
                                    {item.label}
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>

            {/* Remaining top-level items (excluding Dashboard) */}
            {otherMenuItems
              .filter((item) => item.label !== "Dashboard")
              .map((item) => {
                const isActive =
                  activePath.toLowerCase() === item.path.toLowerCase() ||
                  activePath
                    .toLowerCase()
                    .startsWith(item.path.toLowerCase() + "/");
                return (
                  <li key={item.label} className='w-full'>
                    <Tooltip
                      content={item.label}
                      position='right'
                      delay={200}
                      disabled={isSidebarOpen}
                    >
                      <button
                        onClick={() => handleItemClick(item.path)}
                        className={`btn-fade group w-full flex items-center rounded-rd ${
                          isActive
                            ? "bg-neutral-50 text-primary"
                            : "bg-primary text-white hover:text-support-superlight"
                        }`}
                      >
                        <div className='flex items-center w-full flex-1'>
                          <span className='flex-shrink-0 flex items-center justify-center w-12 h-12'>
                            {item.icon}
                          </span>
                          <AnimatePresence>
                            {isSidebarOpen && (
                              <motion.span
                                initial='hidden'
                                animate='visible'
                                exit='hidden'
                                variants={textVariants}
                                className='font-medium whitespace-nowrap flex-1 pr-4 text-left'
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </button>
                    </Tooltip>
                  </li>
                );
              })}
          </ul>
        </nav>

        {/* Info Tab at Bottom */}
        <div className='p-4 border-t border-white'>
          <Tooltip
            content='About EduCompose'
            position='right'
            delay={200}
            disabled={isSidebarOpen}
          >
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className='btn-fade group w-full flex items-center rounded-lg bg-primary text-white hover:text-support-superlight'
            >
              <div className='flex items-center w-full flex-1'>
                <span className='flex-shrink-0 flex items-center justify-center w-12 h-12'>
                  <Info className='w-5 h-5' />
                </span>
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span
                      initial='hidden'
                      animate='visible'
                      exit='hidden'
                      variants={textVariants}
                      className='font-medium whitespace-nowrap flex-1 pr-4 text-left'
                    >
                      About EduCompose
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {!isDesktop && isSidebarOpen && (
        <div
          className='lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30'
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Info Modal */}
      <Modal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        title='About EduCompose'
        size='lg'
      >
        <div className='space-y-6'>
          {/* Header Card */}
          <div className='bg-gradient-to-r from-primary to-primary-500 rounded-rd p-6 text-white'>
            <div className='flex items-center space-x-4'>
              <div className='w-16 h-16 bg-white bg-opacity-20 rounded-rd flex items-center justify-center'>
                <img
                  src={eduComposeLogo}
                  alt='EduCompose Logo'
                  className='w-12 h-12 object-contain'
                />
              </div>
              <div>
                <h3 className='text-2xl font-bold'>EduCompose</h3>
                <p className='text-white text-opacity-90'>
                  Teacher's Companion for Essay Evaluation
                </p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='bg-neutral-100 rounded-rd p-4 border border-neutral-300'>
              <div className='flex items-center space-x-3 mb-2'>
                <BookOpen className='w-6 h-6 text-primary' />
                <h4 className='font-semibold text-neutral-900'>
                  Essay Management
                </h4>
              </div>
              <p className='text-sm text-neutral-600'>
                Streamline essay collection, organization, and grading with our
                intuitive management system.
              </p>
            </div>

            <div className='bg-neutral-100 rounded-rd p-4 border border-neutral-300'>
              <div className='flex items-center space-x-3 mb-2'>
                <Target className='w-6 h-6 text-primary' />
                <h4 className='font-semibold text-neutral-900'>
                  Smart Analytics
                </h4>
              </div>
              <p className='text-sm text-neutral-600'>
                Get detailed insights into student performance and writing
                patterns with advanced analytics.
              </p>
            </div>

            <div className='bg-neutral-100 rounded-rd p-4 border border-neutral-300'>
              <div className='flex items-center space-x-3 mb-2'>
                <Zap className='w-6 h-6 text-primary' />
                <h4 className='font-semibold text-neutral-900'>
                  Quick Grading
                </h4>
              </div>
              <p className='text-sm text-neutral-600'>
                Accelerate your grading process with automated tools and
                customizable rubrics.
              </p>
            </div>

            <div className='bg-neutral-100 rounded-rd p-4 border border-neutral-300'>
              <div className='flex items-center space-x-3 mb-2'>
                <Shield className='w-6 h-6 text-primary' />
                <h4 className='font-semibold text-neutral-900'>
                  Secure Platform
                </h4>
              </div>
              <p className='text-sm text-neutral-600'>
                Your data and student information are protected with
                enterprise-grade security.
              </p>
            </div>
          </div>

          {/* Version Info */}
          <div className='bg-neutral-200 rounded-rd p-4 border border-neutral-300'>
            <div className='flex justify-between items-center'>
              <div>
                <p className='text-sm font-medium text-neutral-900'>
                  Version 1.0.0
                </p>
                <p className='text-xs text-neutral-600'>
                  Last updated: December 2024
                </p>
              </div>
              <div className='text-right'>
                <p className='text-xs text-neutral-600'>
                  Made with for educators
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
