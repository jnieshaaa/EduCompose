import React, { useState } from "react";
import TeacherSidebar from "../components/TeacherSidebar";
import TeacherHeader from "../components/TeacherHeader";
import Breadcrumb from "../components/ui/Breadcrumb";

const TeacherLayout: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
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
        <TeacherHeader onMenuClick={toggleSidebar} isBurgerActive={isSidebarOpen} role="Teacher" />
        <Breadcrumb />

        <main className="flex-1 overflow-y-auto bg-neutral-300/10 px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
