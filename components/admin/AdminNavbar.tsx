"use client";

import { Search, Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/shared/NotificationBell";
import { useState, useEffect } from "react";
import { useAdminLayout } from "./AdminLayoutClient";

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/employees": "Manajemen Pegawai",
  "/admin/attendance": "Monitoring Absensi",
  "/admin/shifts": "Manajemen Shift",
  "/admin/schedule": "Jadwal Kerja",
  "/admin/leave": "Izin & Cuti",
  "/admin/reports": "Laporan",
  "/admin/settings": "Pengaturan Sistem",
  "/admin/audit-log": "Audit Log",
};

export default function AdminNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAdminLayout();
  const [adminName, setAdminName] = useState<string>("Administrator");
  const [logo, setLogo] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");

  const loadSettings = () => {
    fetch(`/api/settings?_t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setAdminName(data.admin_name || "");
          setLogo(data.company_logo || "");
          setCompanyName(data.company_name || "");
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadSettings();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "branding-updated") {
        loadSettings();
      }
    };
    window.addEventListener("branding-updated", loadSettings);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("branding-updated", loadSettings);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const displayName = adminName || session?.user?.name || "Administrator";
  const title =
    Object.entries(pageTitles).find(([key]) => pathname.startsWith(key))?.[1] ??
    "SAMS";

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3.5 sm:px-6 sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden p-2 -ml-1 text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors focus:outline-none cursor-pointer flex-shrink-0"
          title="Buka Menu"
          aria-label="Buka Menu Navigasi"
        >
          <Menu size={22} />
        </button>

        {logo && (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden p-1 shadow-xs flex-shrink-0">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-1.5 sm:gap-2 truncate">
            <span className="truncate">{title}</span>
            {companyName && (
              <span className="hidden lg:inline-block text-xs font-normal text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200 truncate">
                {companyName}
              </span>
            )}
          </h1>
          <p className="text-[11px] sm:text-xs text-gray-400 truncate hidden xs:block sm:block">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Notification Bell */}
        <NotificationBell />

        {/* User Badge */}
        <div className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-100 transition-colors">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shadow-xs">
            {displayName.charAt(0)}
          </div>
          <div className="hidden md:block">
            <div className="text-xs sm:text-sm font-semibold text-gray-700 leading-tight truncate max-w-[120px]">
              {displayName}
            </div>
            <div className="text-[10px] text-gray-400 leading-tight">Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
