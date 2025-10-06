import React from "react";
import ClientSidebar from "../components/ClientSidebar";

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  return <ClientSidebar>{children}</ClientSidebar>;
};

export default ClientLayout;
