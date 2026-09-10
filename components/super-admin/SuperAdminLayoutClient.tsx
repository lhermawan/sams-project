"use client";

import { useState, createContext, useContext } from "react";
import SuperAdminSidebar from "./SuperAdminSidebar";
import SuperAdminNavbar from "./SuperAdminNavbar";

interface SuperAdminLayoutContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const SuperAdminLayoutContext = createContext<SuperAdminLayoutContextType>({
  sidebarOpen: false,
  setSidebarOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
});

export const useSuperAdminLayout = () => useContext(SuperAdminLayoutContext);

export default function SuperAdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SuperAdminLayoutContext.Provider
      value={{ sidebarOpen, setSidebarOpen, collapsed, setCollapsed }}
    >
      <div className="flex h-screen bg-gray-50 overflow-hidden relative">
        {/* Responsive Sidebar */}
        <SuperAdminSidebar />

        {/* Content area: 100% width on mobile (pl-0), dynamically offset on desktop */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            collapsed ? "md:pl-16" : "md:pl-64"
          } pl-0`}
        >
          <SuperAdminNavbar />
          <main className="flex-1 overflow-y-auto p-3 sm:p-6">{children}</main>
        </div>
      </div>
    </SuperAdminLayoutContext.Provider>
  );
}
