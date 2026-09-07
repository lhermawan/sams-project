import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date in Bahasa Indonesia
export function formatDate(date: Date | string, fmt = "EEEE, dd MMMM yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt, { locale: id });
}

// Format time: "08:30"
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "HH:mm");
}

// Format datetime: "08:30 WIB"
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "HH:mm") + " WIB";
}

// Get today's date as YYYY-MM-DD string
export function getTodayDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

// Parse "HH:mm" time string into minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// Calculate late minutes in Asia/Jakarta (WIB) timezone
export function calcLateMinutes(
  checkInTime: Date,
  scheduleStart: string,
  toleranceMin: number
): number {
  const scheduleMinutes = timeToMinutes(scheduleStart);
  const tolerance = scheduleMinutes + toleranceMin;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(checkInTime instanceof Date ? checkInTime : new Date(checkInTime));
  const hours = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minutes = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const checkInMinutes = hours * 60 + minutes;

  return Math.max(0, checkInMinutes - tolerance);
}

// Attendance status label in Bahasa
export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    VALID: "Hadir",
    PENDING: "Menunggu",
    LATE: "Terlambat",
    INCOMPLETE: "Tidak Lengkap",
    ABSENT: "Tidak Hadir",
    REJECTED: "Ditolak",
    CORRECTED: "Dikoreksi",
  };
  return labels[status] ?? status;
}

// Attendance status badge color
export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    VALID: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    LATE: "bg-orange-100 text-orange-700",
    INCOMPLETE: "bg-purple-100 text-purple-700 border border-purple-200",
    ABSENT: "bg-red-100 text-red-700",
    REJECTED: "bg-red-100 text-red-700",
    CORRECTED: "bg-blue-100 text-blue-700",
  };
  return colors[status] ?? "bg-gray-100 text-gray-700";
}
