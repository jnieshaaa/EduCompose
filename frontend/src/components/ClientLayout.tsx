import React, { useState } from "react";
import ClientSidebar from "./ClientSidebar";
import Header from "./Header";

const ClientLayout: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className='flex h-screen'>
      <ClientSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className='flex-1 flex flex-col'>
        <Header onMenuClick={toggleSidebar} isBurgerActive={isSidebarOpen} />

        <main className='flex-1 overflow-y-auto bg-neutral-300/10'>
          {children}
        </main>
      </div>
    </div>
  );
};

export default ClientLayout;
