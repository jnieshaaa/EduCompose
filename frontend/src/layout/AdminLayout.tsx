import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import AdminHeader from "../components/AdminHeader";
import Breadcrumb from "../components/ui/Breadcrumb";

const AdminLayout: React.FC = () => {
  // Start closed on mobile, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 text-neutral-900">
      <AdminSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader 
          onMenuClick={toggleSidebar} 
          isBurgerActive={isSidebarOpen} 
        />
        
        <Breadcrumb />

        <main className="flex-1 overflow-y-auto bg-neutral-300/10 px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 scrollbar-hide">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
