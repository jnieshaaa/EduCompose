import React, { useState } from "react";
import {
  Home,
  FileText,
  BarChart3,
  Settings,
  Users,
  BookOpen,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Search,
} from "lucide-react";

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  badge?: number;
}

const ClientSidebar: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeItem, setActiveItem] = useState("Dashboard");

  const menuItems: MenuItem[] = [
    { icon: <Home className="w-5 h-5" />, label: "Dashboard", path: "/" },
    {
      icon: <FileText className="w-5 h-5" />,
      label: "Essays",
      path: "/essays",
      badge: 5,
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      label: "Analytics",
      path: "/analytics",
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "Students",
      path: "/students",
    },
    {
      icon: <BookOpen className="w-5 h-5" />,
      label: "Resources",
      path: "/resources",
    },
    {
      icon: <Bell className="w-5 h-5" />,
      label: "Notifications",
      path: "/notifications",
      badge: 3,
    },
    {
      icon: <Settings className="w-5 h-5" />,
      label: "Settings",
      path: "/settings",
    },
  ];

  const handleItemClick = (label: string) => {
    setActiveItem(label);
    setIsMobileOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg bg-primary"
      >
        {isMobileOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative h-screen transition-all duration-300 z-40 flex flex-col border-r border-neutral3 bg-white ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          width: isOpen ? "280px" : "80px",
        }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral3">
          {isOpen ? (
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white bg-gradient-to-tr from-primary to-accent">
                EC
              </div>
              <div>
                <h1 className="font-bold text-lg text-primary">EduCompose</h1>
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white bg-gradient-to-tr from-primary to-accent mx-auto">
              EC
            </div>
          )}
        </div>

        {/* Toggle Button (Desktop) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full items-center justify-center shadow-lg bg-primary border-2 border-white"
        >
          {isOpen ? (
            <ChevronLeft className="w-4 h-4 text-white" />
          ) : (
            <ChevronRight className="w-4 h-4 text-white" />
          )}
        </button>

        {/* Search Bar */}
        {isOpen && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm outline-none bg-neutral2 border border-neutral3 focus:border-primary focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.label}>
                <button
                  onClick={() => handleItemClick(item.label)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative ${
                    isOpen ? "justify-start" : "justify-center"
                  } ${
                    activeItem === item.label
                      ? "bg-primary/10 text-primary"
                      : "text-gray-500 hover:bg-neutral2"
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {isOpen && (
                    <>
                      <span className="flex-1 text-left font-medium">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="px-2 py-1 text-xs font-bold text-white rounded-full bg-primary">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {!isOpen && item.badge && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-neutral3 p-4">
          {isOpen ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-tr from-secondary to-primary">
                  JD
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">
                    John Doe
                  </p>
                  <p className="text-xs text-gray-500">Client</p>
                </div>
              </div>
              <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 hover:text-red-600 bg-neutral2 hover:bg-red-50 transition-all">
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </>
          ) : (
            <button className="w-full flex justify-center p-2 rounded-lg text-gray-600 hover:text-red-600 bg-neutral2 hover:bg-red-50 transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 p-8 lg:p-8 pt-20 lg:pt-8 bg-neutral2">
        <div className="rounded-xl shadow-lg p-8 bg-white">{children}</div>
      </div>
    </div>
  );
};

export default ClientSidebar;
