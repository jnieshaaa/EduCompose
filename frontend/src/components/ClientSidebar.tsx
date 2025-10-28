import React, { useState, useEffect, useMemo } from "react";
import {
  Home,
  FileText,
  BarChart3,
  Users,
  GraduationCap,
  ClipboardList,
  Award,
  Settings,
  Bell,
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

interface ClientSidebarProps {
  children?: React.ReactNode;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ClientSidebar: React.FC<ClientSidebarProps> = ({
  children,
  isSidebarOpen,
  setIsSidebarOpen,
}) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [logoShine, setLogoShine] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        icon: <Home className='w-5 h-5' />,
        label: "Dashboard",
        path: "/Dashboard",
      },
      {
        icon: <FileText className='w-5 h-5' />,
        label: "Essay Management",
        path: "/EssayManagement",
      },
      {
        icon: <GraduationCap className='w-5 h-5' />,
        label: "Class Management",
        path: "/ClassManagement",
      },
      {
        icon: <ClipboardList className='w-5 h-5' />,
        label: "Assignments",
        path: "/AssignmentManagement",
      },
      {
        icon: <Award className='w-5 h-5' />,
        label: "Gradebook",
        path: "/Gradebook",
      },
      {
        icon: <BarChart3 className='w-5 h-5' />,
        label: "Analytics",
        path: "/Analytics",
      },
      {
        icon: <Users className='w-5 h-5' />,
        label: "Students",
        path: "/Students",
      },
      {
        icon: <Bell className='w-5 h-5' />,
        label: "Notifications",
        path: "/Notifications",
      },
      {
        icon: <Settings className='w-5 h-5' />,
        label: "Settings",
        path: "/Settings",
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
    document.title = currentItem ? currentItem.label : "EduCompose";
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
        className='fixed lg:relative h-full z-40 flex flex-col border-r border-neutral3 bg-primary overflow-hidden'
        style={{
          width: isSidebarOpen ? "280px" : isDesktop ? "80px" : "0px",
          transition: "width 0.2s",
        }}
      >
        {/* Header */}
        <div className='flex items-center h-20 border-b border-white p-2.5 relative'>
          <div className='relative w-14 h-14 flex-shrink-0 rounded overflow-hidden flex items-center justify-center group'>
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
                  <h1 className='font-bold text-2xl text-white whitespace-nowrap'>
                    EduCompose
                  </h1>
                  <p className='text-xxs font-md mt-0.5 text-white whitespace-nowrap'>
                    Teacher's Companion for Essay Evaluation
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className='flex-1 p-4'>
          <ul className='space-y-2 overflow-hidden'>
            {menuItems.map((item) => {
              const isActive = activePath === item.path;
              return (
                <li key={item.label}>
                  <Tooltip
                    content={item.label}
                    position='right'
                    delay={200}
                    disabled={isSidebarOpen}
                  >
                    <button
                      onClick={() => handleItemClick(item.path)}
                      className={`btn-fade group w-full flex items-center rounded-lg ${
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
                              className='font-medium whitespace-nowrap flex-1'
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
    </div>
  );
};

export default ClientSidebar;
