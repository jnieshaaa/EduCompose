import React from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import Breadcrumb from "../components/ui/Breadcrumb";

const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  return (
    <div className="flex h-screen">
      <AdminSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col">
        <Breadcrumb />

        <main className="flex-1 overflow-y-auto bg-neutral-300/10 px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
