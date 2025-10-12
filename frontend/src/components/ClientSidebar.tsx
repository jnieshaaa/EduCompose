import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  FileText,
  BarChart3,
  Users,
  Menu,
  X,
  BarChart2,
  Notebook,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface ClientSidebarProps {
  children?: React.ReactNode;
  isMobileOpen: boolean;
  setIsMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ClientSidebar: React.FC<ClientSidebarProps> = ({
  children,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [xButtonHeight, setXButtonHeight] = useState(0);

  const xButtonRef = useRef<HTMLButtonElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuItem[] = [
    {
      icon: <Home className='w-5 h-5' />,
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      icon: <FileText className='w-5 h-5' />,
      label: "Essay Management",
      path: "/essays",
    },
    {
      icon: <BarChart3 className='w-5 h-5' />,
      label: "Analysis Report",
      path: "/analytics",
    },
    {
      icon: <BarChart2 className='w-5 h-5' />,
      label: "Class Insights",
      path: "/students",
    },
    {
      icon: <Users className='w-5 h-5' />,
      label: "Student Profile",
      path: "/resources",
    },
    {
      icon: <Notebook className='w-5 h-5' />,
      label: "Teacher Notes",
      path: "/notifications",
    },
  ];

  const [activePath, setActivePath] = useState(location.pathname);
  useEffect(() => setActivePath(location.pathname), [location.pathname]);

  const handleItemClick = (path: string) => {
    navigate(path);
    setIsMobileOpen(false);
  };

  const textVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  // Track desktop vs mobile
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (!desktop) {
        setIsOpen(false);
        setIsLocked(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Measure X button height
  useEffect(() => {
    if (xButtonRef.current) {
      setXButtonHeight(xButtonRef.current.offsetHeight + 16);
    }
  }, [isMobileOpen]);

  return (
    <div className='flex h-screen overflow-hidden'>
      {/* Sidebar */}
      <aside
        className='fixed lg:relative h-full transition-all duration-300 z-40 flex flex-col border-r border-neutral3 bg-primary overflow-hidden'
        style={{
          width: isDesktop
            ? isOpen
              ? "280px"
              : "80px"
            : isMobileOpen
            ? "280px"
            : "0px",
        }}
        onMouseEnter={() => {
          if (isDesktop && !isLocked) setIsOpen(true);
        }}
        onMouseLeave={() => {
          if (isDesktop && !isLocked) setIsOpen(false);
        }}
      >
        {/* Header inside sidebar */}
        <div className='flex items-center justify-between p-4'>
          {isDesktop && (
            <div
              onClick={() => setIsLocked(!isLocked)}
              className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center cursor-pointer transition-colors duration-200 ${
                isLocked ? "bg-accent" : "bg-transparent"
              }`}
            >
              <Menu className='text-white' size={24} />
            </div>
          )}
        </div>

        {/* Navigation links */}
        <nav className='flex-1 p-4'>
          <ul className='space-y-2 overflow-hidden'>
            {menuItems.map((item, index) => {
              const isActive = activePath === item.path;
              return (
                <li
                  key={item.label}
                  style={{
                    marginTop:
                      !isDesktop && index === 0
                        ? `${xButtonHeight}px`
                        : undefined,
                  }}
                >
                  <button
                    onClick={() => handleItemClick(item.path)}
                    className={`group w-full flex items-center rounded-lg ${
                      isActive
                        ? "bg-neutral1 text-primary"
                        : "text-white hover:bg-neutral2 hover:text-primary"
                    }`}
                  >
                    <div className='flex items-center w-full'>
                      <span className='flex-shrink-0 flex items-center justify-center p-3'>
                        {item.icon}
                      </span>
                      <AnimatePresence>
                        {(isDesktop ? isOpen : isMobileOpen) && (
                          <motion.span
                            initial='hidden'
                            animate='visible'
                            exit='hidden'
                            variants={textVariants}
                            className='font-medium whitespace-nowrap'
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
          </ul>
        </nav>
      </aside>

      {/* Mobile X overlay */}
      {isMobileOpen && !isDesktop && (
        <>
          <button
            ref={xButtonRef}
            onClick={() => setIsMobileOpen(false)}
            className='lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg shadow-lg bg-primary'
          >
            <X className='w-6 h-6 text-white' />
          </button>
          <div
            className='lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30'
            onClick={() => setIsMobileOpen(false)}
          />
        </>
      )}

      {/* Main content */}
      <main className='flex-1 h-screen overflow-y-auto bg-neutral2'>
        {children}
      </main>
    </div>
  );
};

export default ClientSidebar;
