import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import TeacherSidebar from "../components/TeacherSidebar";
import TeacherHeader from "../components/TeacherHeader";
import Breadcrumb from "../components/ui/Breadcrumb";

const TeacherLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex h-screen">
      <TeacherSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col">
        <TeacherHeader onMenuClick={toggleSidebar} isBurgerActive={isSidebarOpen} />
        <Breadcrumb />

        <main className="flex-1 overflow-y-auto bg-neutral-300/10 px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
