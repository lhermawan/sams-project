"use client";

import { useState, createContext, useContext } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminNavbar from "./AdminNavbar";

interface AdminLayoutContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const AdminLayoutContext = createContext<AdminLayoutContextType>({
  sidebarOpen: false,
  setSidebarOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
});

export const useAdminLayout = () => useContext(AdminLayoutContext);

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AdminLayoutContext.Provider
      value={{ sidebarOpen, setSidebarOpen, collapsed, setCollapsed }}
    >
      <div className="flex h-screen bg-gray-50 overflow-hidden relative">
        {/* Responsive Sidebar */}
        <AdminSidebar />

        {/* Content area: 100% width on mobile (pl-0), dynamically offset on desktop */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            collapsed ? "md:pl-16" : "md:pl-64"
          } pl-0`}
        >
          <AdminNavbar />
          <main className="flex-1 overflow-y-auto p-3 sm:p-6">{children}</main>
        </div>
      </div>
    </AdminLayoutContext.Provider>
  );
}
