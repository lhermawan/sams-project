import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
} from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SearchParams {
  month?: string; // "2024-09"
}

async function getMonthAttendance(employeeId: string, year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));

  const records = await prisma.attendance.findMany({
    where: {
      employeeId,
      date: { gte: start, lte: end },
    },
  });

  const map: Record<string, string> = {};
  for (const r of records) {
    const key = format(new Date(r.date), "yyyy-MM-dd");
    map[key] = r.status;
  }
  return map;
}

const statusColors: Record<string, string> = {
  VALID: "bg-green-500 text-white",
  LATE: "bg-orange-400 text-white",
  ABSENT: "bg-red-500 text-white",
  PENDING: "bg-yellow-400 text-white",
  REJECTED: "bg-red-600 text-white",
  CORRECTED: "bg-blue-500 text-white",
};

const statusDotColors: Record<string, string> = {
  VALID: "bg-green-400",
  LATE: "bg-orange-400",
  ABSENT: "bg-red-400",
  PENDING: "bg-yellow-400",
  REJECTED: "bg-red-600",
  CORRECTED: "bg-blue-400",
};

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const employeeId = session?.user?.employeeId;
  if (!employeeId) return null;

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  if (searchParams.month) {
    const [y, m] = searchParams.month.split("-").map(Number);
    year = y;
    month = m;
  }

  const currentMonthDate = new Date(year, month - 1);
  const attendance = await getMonthAttendance(employeeId, year, month);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonthDate),
    end: endOfMonth(currentMonthDate),
  });

  const firstDayOfWeek = getDay(days[0]); // 0=Sunday

  const prevMonth =
    month === 1
      ? `${year - 1}-12`
      : `${year}-${String(month - 1).padStart(2, "0")}`;
  const nextMonth =
    month === 12
      ? `${year + 1}-01`
      : `${year}-${String(month + 1).padStart(2, "0")}`;

  const monthStr = format(currentMonthDate, "MMMM yyyy", { locale: id });

  const legend = [
    { label: "Hadir", color: "bg-green-500" },
    { label: "Terlambat", color: "bg-orange-400" },
    { label: "Tidak Hadir", color: "bg-red-500" },
    { label: "Menunggu", color: "bg-yellow-400" },
    { label: "Izin/Cuti", color: "bg-blue-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">Kalender Absensi</h1>
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* Month navigation */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <a
              href={`/calendar?month=${prevMonth}`}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ChevronLeft size={16} />
            </a>
            <h2 className="font-semibold text-gray-800 capitalize">{monthStr}</h2>
            <a
              href={`/calendar?month=${nextMonth}`}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ChevronRight size={16} />
            </a>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
              <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const status = attendance[key];
              const isToday = format(day, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
              const dayNum = format(day, "d");

              return (
                <div key={key} className="flex flex-col items-center py-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                      ${status ? statusColors[status] ?? "bg-gray-100 text-gray-600" : isToday ? "bg-blue-600 text-white" : "text-gray-600"}
                      ${isToday && !status ? "ring-2 ring-blue-600" : ""}
                    `}
                  >
                    {dayNum}
                  </div>
                  {status && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${statusDotColors[status] ?? "bg-gray-400"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Keterangan</h3>
          <div className="grid grid-cols-2 gap-2">
            {legend.map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full ${l.color}`} />
                <span className="text-sm text-gray-600">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly summary */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Ringkasan Bulan Ini</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Hadir", value: Object.values(attendance).filter((s) => s === "VALID").length, color: "text-green-600" },
              { label: "Terlambat", value: Object.values(attendance).filter((s) => s === "LATE").length, color: "text-orange-500" },
              { label: "Tidak Hadir", value: Object.values(attendance).filter((s) => s === "ABSENT").length, color: "text-red-500" },
            ].map((s) => (
              <div key={s.label}>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
