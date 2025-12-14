import React, { useState, useEffect, useMemo } from "react";
import {
  Home,
  FileText,
  // Layers,
  // BarChart3,
  // Users,
  // GraduationCap,
  // ClipboardList,
  // Award,
  Info,
  // BookOpen,
  // Target,
  // Zap,
  // Shield,
  // LayoutDashboard,
  // Users,
  ClipboardCheck,
  // BarChart3,
  Settings,
  // X,
  LayoutDashboard, // New icon for student dashboard
  Upload, // New icon for submit essay
  MessageSquare, // New icon for AI Feedback
  TrendingUp, // New icon for Progress & Analytics
  Bell, // New icon for Notifications
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

interface StudentSidebarProps {
  children?: React.ReactNode;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// Renamed component from ClientSidebar to StudentSidebar
const StudentSidebar: React.FC<StudentSidebarProps> = ({
  children,
  isSidebarOpen,
  setIsSidebarOpen,
}) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [logoShine, setLogoShine] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Updated menu items for the student role
  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        icon: <LayoutDashboard className='w-5 h-5' />,
        label: "Dashboard",
        path: "/Student/Dashboard", 
      },
      {
        icon: <Upload className='w-5 h-5' />,
        label: "Submit Essay",
        path: "/Student/Submit", 
      },
      {
        icon: <FileText className='w-5 h-5' />,
        label: "My Essays",
        path: "/Student/Essays",
      },
      {
        icon: <MessageSquare className='w-5 h-5' />,
        label: "AI Feedback",
        path: "/Student/Feedback",
      },
      {
        icon: <TrendingUp className='w-5 h-5' />,
        label: "Progress & Analytics",
        path: "/Student/Progress",
      },
      {
        icon: <ClipboardCheck className='w-5 h-5' />,
        label: "Rubric / Criteria",
        path: "/Student/Rubric",
      },
      {
        icon: <Bell className='w-5 h-5' />,
        label: "Notifications",
        path: "/Student/Notifications",
      },
      {
        icon: <Settings className='w-5 h-5' />,
        label: "Settings",
        path: "/Student/Settings",
      },
    ],
    []
  );

  const [activePath, setActivePath] = useState(location.pathname);
  useEffect(() => setActivePath(location.pathname), [location.pathname]);

  const handleItemClick = (path: string) => {
    navigate(path);
    if (!isDesktop) setIsSidebarOpen(false);
  };

  useEffect(() => {
    const currentItem = menuItems.find(
      (item) => item.path.toLowerCase() === location.pathname.toLowerCase()
    );
    // Title updated to reflect Student context
    document.title = currentItem ? currentItem.label : "EduCompose Student";
  }, [location.pathname, menuItems]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
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
          width: isSidebarOpen ? "280px" : isDesktop ? "80px" : "0px",
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
              <div className='ml-3 flex flex-col overflow-hidden w-[184px]'>
                <AnimatePresence>
                  <motion.div
                    initial='hidden'
                    animate='visible'
                    exit='hidden'
                    variants={textVariants}
                    className='flex flex-col max-w-[200px]'
                  >
                    {/* 👇 CHANGE 2 (Optional but Recommended): Reduced title text size from text-2xl to text-xl */}
                    <h1 className='font-bold text-xl text-white whitespace-nowrap'>
                      EduCompose
                    </h1>
                    <p className='text-xxs font-md mt-0.5 text-white whitespace-nowrap'>
                      Student Portal for Essay Evaluation
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
            {menuItems.map((item) => {
              const isActive = activePath === item.path;
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

      <main className='flex-1 h-screen overflow-y-auto bg-neutral2'>
        {children}
      </main>

      {/* Info Modal - Reused from ClientSidebar */}
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
                <Upload className='w-6 h-6 text-primary' />
                <h4 className='font-semibold text-neutral-900'>
                  Essay Submission
                </h4>
              </div>
              <p className='text-sm text-neutral-600'>
                Easily submit your essays and track their status through the portal.
              </p>
            </div>

            <div className='bg-neutral-100 rounded-rd p-4 border border-neutral-300'>
              <div className='flex items-center space-x-3 mb-2'>
                <MessageSquare className='w-6 h-6 text-primary' />
                <h4 className='font-semibold text-neutral-900'>
                  AI-Powered Feedback
                </h4>
              </div>
              <p className='text-sm text-neutral-600'>
                Receive instant, constructive feedback on your writing to help you improve.
              </p>
            </div>

            <div className='bg-neutral-100 rounded-rd p-4 border border-neutral-300'>
              <div className='flex items-center space-x-3 mb-2'>
                <TrendingUp className='w-6 h-6 text-primary' />
                <h4 className='font-semibold text-neutral-900'>
                  Track Progress
                </h4>
              </div>
              <p className='text-sm text-neutral-600'>
                Visualize your improvement over time with detailed progress and analytics.
              </p>
            </div>

            <div className='bg-neutral-100 rounded-rd p-4 border border-neutral-300'>
              <div className='flex items-center space-x-3 mb-2'>
                <ClipboardCheck className='w-6 h-6 text-primary' />
                <h4 className='font-semibold text-neutral-900'>
                  View Rubrics
                </h4>
              </div>
              <p className='text-sm text-neutral-600'>
                Understand the grading criteria for each assignment to meet expectations.
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
                  Made with for educators and students
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentSidebar;