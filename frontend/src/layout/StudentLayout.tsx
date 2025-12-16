import React, { useState } from "react";
import { Outlet } from "react-router-dom";
// Import the student-specific components
import StudentSidebar from "../components/StudentSidebar";
import StudentHeader from "../components/StudentHeader";
import Breadcrumb from "../components/ui/Breadcrumb";

const StudentLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex h-screen">
      {/* 1. Student-specific Sidebar */}
      <StudentSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col">
        {/* 2. Student-specific Header */}
        <StudentHeader 
          onMenuClick={toggleSidebar} 
          isBurgerActive={isSidebarOpen} 
          // Explicitly set the role for the header component
          role="Student" 
        />
        
        {/* Breadcrumb is a generic UI component, so it remains the same */}
        <Breadcrumb />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-neutral-300/10 px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;