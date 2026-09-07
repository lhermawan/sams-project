import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import AttendanceHistoryList from "@/components/employee/AttendanceHistoryList";

interface SearchParams {
  period?: string;
  page?: string;
}

const periodLabels: Record<string, string> = {
  today: "Hari Ini",
  week: "Minggu Ini",
  month: "Bulan Ini",
  "3month": "3 Bulan",
  "6month": "6 Bulan",
  year: "Tahun Ini",
};

async function getHistory(employeeId: string, period = "month", page = 1) {
  const limit = 20;
  const now = new Date();
  let from: Date, to: Date;

  switch (period) {
    case "today":
      from = new Date(now); from.setHours(0, 0, 0, 0);
      to = new Date(now); to.setHours(23, 59, 59, 999);
      break;
    case "week":
      const dayOfWeek = now.getDay();
      from = new Date(now); from.setDate(now.getDate() - dayOfWeek); from.setHours(0, 0, 0, 0);
      to = new Date(from); to.setDate(from.getDate() + 6); to.setHours(23, 59, 59, 999);
      break;
    case "3month":
      from = startOfMonth(subMonths(now, 2));
      to = endOfMonth(now);
      break;
    case "6month":
      from = startOfMonth(subMonths(now, 5));
      to = endOfMonth(now);
      break;
    case "year":
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      break;
    default: // month
      from = startOfMonth(now);
      to = endOfMonth(now);
  }

  const where = { employeeId, date: { gte: from, lte: to } };

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { shift: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  // Summary stats
  const valid = records.filter((r) => r.status === "VALID").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const totalLateMin = records.reduce((acc, r) => acc + r.lateMinutes, 0);

  return { records, total, valid, late, absent, totalLateMin, limit };
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const employeeId = session?.user?.employeeId;
  if (!employeeId) return null;

  const period = searchParams.period ?? "month";
  const page = parseInt(searchParams.page ?? "1");
  const { records, total, valid, late, absent, totalLateMin, limit } =
    await getHistory(employeeId, period, page);
  const totalPages = Math.ceil(total / limit);

  const statusMap: Record<string, { label: string; color: string }> = {
    VALID: { label: "Hadir", color: "bg-green-100 text-green-700" },
    LATE: { label: "Terlambat", color: "bg-orange-100 text-orange-700" },
    ABSENT: { label: "Tidak Hadir", color: "bg-red-100 text-red-700" },
    PENDING: { label: "Menunggu", color: "bg-yellow-100 text-yellow-700" },
    REJECTED: { label: "Ditolak", color: "bg-red-100 text-red-700" },
    CORRECTED: { label: "Dikoreksi", color: "bg-blue-100 text-blue-700" },
  };

  const serializedRecords = records.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    checkInTime: r.checkInTime ? r.checkInTime.toISOString() : null,
    checkOutTime: r.checkOutTime ? r.checkOutTime.toISOString() : null,
    checkInPhoto: r.checkInPhoto,
    workplacePhoto: r.workplacePhoto,
    checkOutPhoto: r.checkOutPhoto,
    checkInDistance: r.checkInDistance,
    checkOutDistance: r.checkOutDistance,
    lateMinutes: r.lateMinutes,
    status: r.status,
    notes: r.notes,
    adminNotes: r.adminNotes,
    shift: r.shift
      ? {
          name: r.shift.name,
          startTime: r.shift.startTime,
          endTime: r.shift.endTime,
        }
      : null,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">Riwayat Absensi</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Klik pada absensi untuk melihat foto dan catatan admin
        </p>
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* Period filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {Object.entries(periodLabels).map(([key, label]) => (
            <Link
              key={key}
              href={`/history?period=${key}`}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                period === key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Hadir", value: valid, color: "text-green-600 bg-green-50" },
            { label: "Terlambat", value: late, color: "text-orange-600 bg-orange-50" },
            { label: "Absen", value: absent, color: "text-red-600 bg-red-50" },
            { label: "Total Telat", value: `${totalLateMin}m`, color: "text-gray-600 bg-gray-50" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-xs opacity-80">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Records */}
        <AttendanceHistoryList records={serializedRecords} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pb-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/history?period=${period}&page=${p}`}
                className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center ${
                  p === page ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
