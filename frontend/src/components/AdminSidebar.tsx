import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Home,
  Users,
  Settings,
  ClipboardCheck,
  BookOpen,
  Info,
  LogOut,
  ChevronUp,
  ChevronDown,
  GraduationCap,
  Archive,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import Modal from "./ui/Modal";
import eduComposeLogo from "../assets/EduCompose.png";

const AdminSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const [logoShine, setLogoShine] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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

  const navigate = useNavigate();
  const location = useLocation();
  const SIDEBAR_WIDTH = "240px";

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
        icon: <Home size={20} />,
        label: "Dashboard",
        path: "/Admin/Dashboard",
      },
      {
        icon: <Users size={20} />,
        label: "User Management",
        path: "/Admin/Users",
      },
      {
        icon: <Users size={20} />,
        label: "Students",
        path: "/Admin/Students",
      },
      {
        icon: <GraduationCap size={20} />,
        label: "Academics",
        path: "/Admin/Schools",
      },
      {
        icon: <ClipboardCheck size={20} />,
        label: "Platform Rubrics",
        path: "/Admin/Rubrics",
      },
      {
        icon: <BookOpen size={20} />,
        label: "Content Management",
        path: "/Admin/Content",
      },
      {
        icon: <Archive size={20} />,
        label: "Archive Records",
        path: "/Admin/Archive",
      },
      {
        icon: <Settings size={20} />,
        label: "Settings",
        path: "/Admin/Settings",
      },
    ],
    [],
  );

  const isItemActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <>
      <aside
        className="fixed left-0 top-0 h-screen flex flex-col bg-primary border-r border-white/10 text-white z-40"
        style={{ width: SIDEBAR_WIDTH }}
      >
        {/* Header */}
        <div className="flex items-center h-20 px-6 border-b border-white/10">
          <div
            className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/5 p-1 cursor-pointer"
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
          <div className="ml-3">
            <h1 className="font-bold text-xl">EduCompose</h1>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul className="space-y-1.5">
            {menuItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isItemActive(item.path) ? "bg-white text-primary" : "text-white/70 hover:bg-white/10"}`}
                >
                  {item.icon}
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile Dropdown */}
        <div className="p-4 border-t border-white/10 relative" ref={menuRef}>
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-xl border border-neutral-100 overflow-hidden py-1 z-50">
              <button
                onClick={() => {
                  setIsInfoModalOpen(true);
                  setIsUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                <Info size={16} /> About Platform
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}

          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">
              {user?.full_name.charAt(0) || "U"}
            </div>
            <div className="flex-1 text-left overflow-hidden">
              <p className="text-sm font-semibold truncate">
                {user?.full_name || "User"}
              </p>
              <p className="text-[10px] text-white/50 truncate">
                {user?.role === "admin" ? "Administrator" : "User"}
              </p>
            </div>
            {isUserMenuOpen ? (
              <ChevronUp size={16} className="text-white/50" />
            ) : (
              <ChevronDown size={16} className="text-white/50" />
            )}
          </button>
        </div>
      </aside>

      <div
        style={{ marginLeft: SIDEBAR_WIDTH }}
        className="min-h-screen bg-neutral-50"
      />

      <Modal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        title="About EduCompose"
      >
        <p className="text-neutral-600">
          EduCompose v1.0.0 — Empowering educators through intelligent essay
          evaluation.
        </p>
      </Modal>
    </>
  );
};

export default AdminSidebar;
