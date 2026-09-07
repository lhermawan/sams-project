"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarCheck, History, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Beranda" },
  { href: "/attendance", icon: CalendarCheck, label: "Absensi" },
  { href: "/history", icon: History, label: "Riwayat" },
  { href: "/calendar", icon: Calendar, label: "Kalender" },
  { href: "/profile", icon: User, label: "Profil" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all",
                isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <item.icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={cn(
                  "transition-transform",
                  isActive && "scale-110"
                )}
              />
              <span className={cn("text-xs", isActive && "font-semibold")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
