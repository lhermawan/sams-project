"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Clock,
  Calendar,
  FileText,
  Settings,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sliders,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSuperAdminLayout } from "./SuperAdminLayoutClient";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tenants" },
  { href: "/users", icon: Users, label: "Users" },
  { href: "/reports", icon: FileText, label: "Laporan" },
];

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarOpen, setSidebarOpen, collapsed, setCollapsed } = useSuperAdminLayout();
  const [logo, setLogo] = useState<string>("");
  const [appName, setAppName] = useState<string>("SAMS");
  const [companyName, setCompanyName] = useState<string>("");

  

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex flex-col h-screen bg-gray-900 text-white transition-all duration-300 fixed top-0 bottom-0",
          // Desktop positioning & width
          "md:z-30 md:left-0",
          collapsed ? "md:w-16" : "md:w-64",
          // Mobile drawer positioning
          "z-50 w-72 left-0 -translate-x-full md:translate-x-0",
          sidebarOpen && "translate-x-0 shadow-2xl"
        )}
      >
        {/* Logo & Close / Collapse Header */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-700">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {logo ? (
              <img src={logo} alt="Logo" className="w-full h-full object-contain p-0.5" />
            ) : (
              <Shield size={16} className="text-white" />
            )}
          </div>
          {(!collapsed || sidebarOpen) && (
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm leading-tight truncate">SAMS Hub</div>
              <div className="text-xs text-gray-400 leading-tight truncate">
                {companyName || "Admin Panel"}
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex ml-auto text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800"
            title={collapsed ? "Perlebar Menu" : "Perkecil Menu"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden ml-auto text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            title="Tutup Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="space-y-0.5 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium",
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  {(!collapsed || sidebarOpen) && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User + Logout */}
        <div className="border-t border-gray-700 p-3">
          {(!collapsed || sidebarOpen) && (
            <div className="flex items-center gap-2 px-2 py-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                {session?.user?.name?.charAt(0) ?? "A"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{session?.user?.name}</div>
                <div className="text-xs text-gray-400 truncate">{session?.user?.email}</div>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={cn(
              "flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm px-3 py-2 rounded-lg hover:bg-gray-800 w-full font-medium cursor-pointer",
              collapsed && !sidebarOpen && "justify-center"
            )}
          >
            <LogOut size={16} />
            {(!collapsed || sidebarOpen) && <span>Keluar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
