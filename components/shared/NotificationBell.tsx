"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  X,
  CalendarCheck,
  AlertCircle,
  Clock,
  Info,
  FileText,
  AlertTriangle,
  ChevronRight,
  Building2,
  FileSpreadsheet,
  ShieldAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: string | null;
  createdAt: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  ATTENDANCE_SUCCESS: <CalendarCheck size={16} className="text-emerald-500" />,
  LATE_WARNING: <Clock size={16} className="text-orange-500" />,
  LATE_ATTENDANCE: <AlertTriangle size={16} className="text-red-500" />,
  SCHEDULE_CHANGE: <Info size={16} className="text-blue-500" />,
  LEAVE_REQUEST: <FileText size={16} className="text-purple-600" />,
  LEAVE_STATUS: <CheckCheck size={16} className="text-emerald-600" />,
  LEAVE_RESULT: <CheckCheck size={16} className="text-purple-500" />,
  VALIDATION_REQUEST: <AlertCircle size={16} className="text-amber-500" />,
  TENANT_CREATED: <Building2 size={16} className="text-blue-500" />,
  TENANT_UPDATED: <Building2 size={16} className="text-amber-500" />,
  BULK_IMPORT_COMPLETED: <FileSpreadsheet size={16} className="text-emerald-500" />,
  SECURITY_ALERT: <ShieldAlert size={16} className="text-rose-500" />,
  SYSTEM: <Info size={16} className="text-gray-500" />,
};

export default function NotificationBell({
  iconClassName = "text-gray-500",
}: {
  iconClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL");
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=25");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) {
      markRead(n.id);
    }

    if (n.data) {
      try {
        const parsed = JSON.parse(n.data);
        if (parsed?.url) {
          setOpen(false);
          router.push(parsed.url);
          return;
        }
      } catch {
        if (typeof n.data === "string" && n.data.startsWith("/")) {
          setOpen(false);
          router.push(n.data);
          return;
        }
      }
    }
  };

  const displayedNotifications =
    tab === "UNREAD" ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-black/5 transition-colors cursor-pointer"
        title="Notifikasi"
      >
        <Bell size={20} className={iconClassName} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 text-sm">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-700 text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                  {unreadCount} baru
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCheck size={13} /> Tandai dibaca
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200/50 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filter Tab */}
          <div className="flex border-b border-gray-100 text-xs px-2 pt-2 bg-white gap-1">
            <button
              type="button"
              onClick={() => setTab("ALL")}
              className={`pb-2 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                tab === "ALL"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("UNREAD")}
              className={`pb-2 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                tab === "UNREAD"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
          </div>

          {/* List Notifications */}
          <div className="max-h-84 overflow-y-auto divide-y divide-gray-50">
            {displayedNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-xs">
                {tab === "UNREAD"
                  ? "Semua notifikasi sudah dibaca."
                  : "Belum ada notifikasi."}
              </div>
            ) : (
              displayedNotifications.map((n) => {
                const hasLink = Boolean(n.data);

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`group px-4 py-3 cursor-pointer hover:bg-blue-50/50 transition-colors ${
                      !n.isRead ? "bg-blue-50/30" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-xl bg-gray-50 border border-gray-100 group-hover:bg-white transition-colors">
                        {typeIcons[n.type] ?? (
                          <Info size={16} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-semibold text-gray-800 leading-tight group-hover:text-blue-600 transition-colors">
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-gray-400">
                            {formatDistanceToNow(new Date(n.createdAt), {
                              addSuffix: true,
                              locale: id,
                            })}
                          </span>
                          {hasLink && (
                            <span className="text-[10px] font-medium text-blue-600 opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                              Buka <ChevronRight size={11} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
