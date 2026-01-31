import React, { useState, useEffect, useMemo } from "react";
import {
  Home,
  Users,
  Shield,
  Settings,
  ClipboardCheck,
  BookOpen,
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

interface AdminSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
}) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );
  const [logoShine, setLogoShine] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Admin menu items
  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        icon: <Home className="w-5 h-5" />,
        label: "Dashboard",
        path: "/Admin/Dashboard",
      },
      {
        icon: <Users className="w-5 h-5" />,
        label: "User Management",
        path: "/Admin/Users",
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
        icon: <Settings className="w-5 h-5" />,
        label: "Settings",
        path: "/Admin/Settings",
      },
    ],
    []
  );

  const [activePath, setActivePath] = useState(location.pathname);

  useEffect(() => {
    setActivePath(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleItemClick = (path: string) => {
    navigate(path);
    if (!isDesktop && !isTablet) {
      setIsSidebarOpen(false);
    }
  };

  const isItemActive = (path: string): boolean => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const textVariants = {
    hidden: { opacity: 0, width: 0 },
    visible: { opacity: 1, width: "auto" },
  };

  return (
    <>
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-primary text-white transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-20"
        } ${!isDesktop && !isTablet && !isSidebarOpen ? "-translate-x-full" : ""}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-4 border-b border-primary-600">
            <div className="flex items-center justify-center">
              <button
                onClick={() => {
                  setLogoShine(true);
                  setTimeout(() => setLogoShine(false), 600);
                  navigate("/Admin/Dashboard");
                }}
                className="relative"
              >
                <img
                  src={eduComposeLogo}
                  alt="EduCompose Logo"
                  className={`h-12 w-12 transition-all duration-300 ${
                    logoShine ? "scale-110 brightness-125" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
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
                        className={`btn-fade group w-full flex items-center rounded-rd ${
                          isActive
                            ? "bg-neutral-50 text-primary"
                            : "bg-primary text-white hover:text-support-superlight"
                        }`}
                      >
                        <div className="flex items-center w-full flex-1">
                          <span className="flex-shrink-0 flex items-center justify-center w-12 h-12">
                            {item.icon}
                          </span>
                          <AnimatePresence>
                            {isSidebarOpen && (
                              <motion.span
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                variants={textVariants}
                                className="font-medium whitespace-nowrap flex-1 pr-4 text-left"
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

          {/* Info Button */}
          <div className="p-4 border-t border-primary-600">
            <Tooltip
              content="About EduCompose"
              position="right"
              delay={200}
              disabled={isSidebarOpen}
            >
              <button
                onClick={() => setIsInfoModalOpen(true)}
                className="btn-fade group w-full flex items-center rounded-rd bg-primary text-white hover:text-support-superlight"
              >
                <span className="flex-shrink-0 flex items-center justify-center w-12 h-12">
                  <Shield className="w-5 h-5" />
                </span>
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={textVariants}
                      className="font-medium whitespace-nowrap flex-1 pr-4 text-left"
                    >
                      About
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Info Modal */}
      <Modal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        title="About EduCompose"
      >
        <div className="space-y-4">
          <p className="text-neutral-700">
            EduCompose is a comprehensive essay evaluation platform designed for
            educators to efficiently grade and provide feedback on student essays.
          </p>
          <p className="text-neutral-700">
            <strong>Version:</strong> 1.0.0
          </p>
        </div>
      </Modal>

      {/* Overlay for mobile */}
      {!isDesktop && !isTablet && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default AdminSidebar;

