import React, { useState } from "react";
import ClientSidebar from "./ClientSidebar";
import Header from "./Header";

interface ClientLayoutProps {
  children?: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  // Mobile sidebar state lifted here
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className='flex h-screen'>
      {/* Sidebar */}
      <ClientSidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main area */}
      <div className='flex-1 flex flex-col'>
        {/* Header: pass toggle function */}
        <Header onMenuClick={() => setIsMobileOpen((prev) => !prev)} />

        {/* Page content */}
        <main className='flex-1 overflow-y-auto bg-neutral2'>{children}</main>
      </div>
    </div>
  );
};

export default ClientLayout;
