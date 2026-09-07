import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format, startOfDay, endOfDay } from "date-fns";
import { id } from "date-fns/locale";
import { MapPin, Clock, CalendarCheck, CheckCircle, XCircle, ClipboardList } from "lucide-react";
import NotificationBell from "@/components/shared/NotificationBell";

import { ScheduleResolver } from "@/lib/engine/schedule-resolver";

async function getEmployeeData(employeeId: string) {
  const today = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [employee, todayAttendance, settings] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employeeShifts: {
          where: { isActive: true },
          include: { shift: true },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
    }),
    prisma.attendance.findFirst({
      where: {
        employeeId,
        date: { gte: today, lte: todayEnd },
      },
    }),
    prisma.systemSetting.findMany({
      where: { key: { in: ["company_logo", "company_name", "app_name"] } },
    }),
  ]);

  const resolvedSchedule = await ScheduleResolver.resolveForEmployee(employeeId, new Date());

  return { employee, todayAttendance, resolvedSchedule, settings };
}

import RecentAttendanceList from "@/components/employee/RecentAttendanceList";

async function getRecentHistory(employeeId: string) {
  return prisma.attendance.findMany({
    where: { employeeId },
    include: {
      shift: true,
      handover: { include: { photos: true } },
      periodicReports: { include: { photos: true }, orderBy: { checkpointSequence: "asc" } },
    },
    orderBy: { date: "desc" },
    take: 5,
  });
}

export default async function EmployeeDashboardPage() {
  const session = await auth();
  const employeeId = session?.user?.employeeId;
  if (!employeeId) return null;

  const { employee, todayAttendance, resolvedSchedule, settings } = await getEmployeeData(employeeId);
  const recentHistory = await getRecentHistory(employeeId);
  const todayFormatted = format(new Date(), "EEEE, dd MMMM yyyy", { locale: id });
  
  let scheduleText = "08:00-17:00";
  if (resolvedSchedule.isHoliday) {
    scheduleText = "Libur Nasional";
  } else if (!resolvedSchedule.isWorkDay || resolvedSchedule.isDayOff) {
    scheduleText = "Hari Libur";
  } else if (resolvedSchedule.startTime && resolvedSchedule.endTime) {
    scheduleText = `${resolvedSchedule.startTime}-${resolvedSchedule.endTime}`;
  }

  const settingsMap = (settings || []).reduce(
    (acc: Record<string, string>, curr: { key: string; value: string }) => {
      acc[curr.key] = curr.value;
      return acc;
    },
    {}
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const serializedRecent = recentHistory.map((att) => ({
    id: att.id,
    date: att.date.toISOString(),
    checkInTime: att.checkInTime ? att.checkInTime.toISOString() : null,
    checkOutTime: att.checkOutTime ? att.checkOutTime.toISOString() : null,
    checkInPhoto: att.checkInPhoto,
    workplacePhoto: att.workplacePhoto,
    checkOutPhoto: att.checkOutPhoto,
    checkInDistance: att.checkInDistance,
    checkOutDistance: att.checkOutDistance,
    lateMinutes: att.lateMinutes,
    status: att.status,
    notes: att.notes,
    adminNotes: att.adminNotes,
    shift: att.shift
      ? {
          name: att.shift.name,
          startTime: att.shift.startTime,
          endTime: att.shift.endTime,
        }
      : null,
    handover: (att as any).handover ? {
      handoverNotes: (att as any).handover.handoverNotes,
      status: (att as any).handover.status,
      photos: (att as any).handover.photos.map((p: any) => ({ photoUrl: p.photoUrl })),
    } : null,
    periodicReports: (att as any).periodicReports ? (att as any).periodicReports.map((pr: any) => ({
      id: pr.id,
      checkpointSequence: pr.checkpointSequence,
      scheduledAt: pr.scheduledAt.toISOString(),
      submittedAt: pr.submittedAt ? pr.submittedAt.toISOString() : null,
      status: pr.status,
      reportNotes: pr.reportNotes,
      photos: pr.photos.map((p: any) => ({ photoUrl: p.photoUrl })),
    })) : [],
  }));

  return (
    <div className="space-y-0">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-5 pt-8 pb-6 relative">
        {/* Top Branding Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {settingsMap.company_logo ? (
              <img
                src={settingsMap.company_logo}
                alt="Logo"
                className="w-8 h-8 rounded-lg object-contain bg-white/10 p-1"
              />
            ) : null}
            <div className="leading-none">
              <span className="text-xs font-bold tracking-wider uppercase text-blue-100">
                {settingsMap.company_name || settingsMap.app_name || "SAMS"}
              </span>
            </div>
          </div>
          <NotificationBell iconClassName="text-white" />
        </div>

        <p className="text-blue-200 text-sm">{getGreeting()}</p>
        <h1 className="text-2xl font-bold mt-0.5">{employee?.name ?? session?.user?.name}</h1>
        <div className="flex items-center gap-4 mt-2 text-blue-200 text-sm">
          <span>{employee?.nip}</span>
          <span>•</span>
          <span>{employee?.department}</span>
        </div>

        {/* Profile Circle */}
        <div className="mt-4 w-14 h-14 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 shadow-lg">
          {employee?.name?.charAt(0) ?? "P"}
        </div>
      </div>

      <div className="px-5 space-y-4 mt-4">
        {/* Today's Status Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Status Hari Ini</h2>
            <span className="text-xs text-gray-400">{todayFormatted}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Absensi</div>
              <div className={`text-sm font-semibold ${todayAttendance ? "text-green-600" : "text-gray-400"}`}>
                {todayAttendance?.checkInTime
                  ? format(new Date(todayAttendance.checkInTime), "HH:mm")
                  : "Belum"}
              </div>
            </div>
            <div className="text-center border-x border-gray-100">
              <div className="text-xs text-gray-400 mb-1">Pulang</div>
              <div className={`text-sm font-semibold ${todayAttendance?.checkOutTime ? "text-blue-600" : "text-gray-400"}`}>
                {todayAttendance?.checkOutTime
                  ? format(new Date(todayAttendance.checkOutTime), "HH:mm")
                  : "Belum"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Jadwal</div>
              <div className="text-sm font-semibold text-gray-700">
                {scheduleText}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action — Attendance */}
        <a
          href="/attendance"
          className={`flex items-center gap-4 p-5 rounded-2xl shadow-sm border transition-all ${
            todayAttendance?.checkInTime && todayAttendance?.checkOutTime
              ? "bg-green-50 border-green-200"
              : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            todayAttendance?.checkInTime ? "bg-green-100" : "bg-blue-500"
          }`}>
            <CalendarCheck size={24} className={todayAttendance?.checkInTime ? "text-green-600" : "text-white"} />
          </div>
          <div>
            <div className={`font-semibold ${todayAttendance?.checkInTime ? "text-green-800" : "text-white"}`}>
              {todayAttendance?.checkInTime && todayAttendance?.checkOutTime
                ? "Absensi Selesai"
                : todayAttendance?.checkInTime
                ? "Absen Pulang"
                : "Absen Masuk"}
            </div>
            <div className={`text-sm ${todayAttendance?.checkInTime ? "text-green-600" : "text-blue-200"}`}>
              {todayAttendance?.checkInTime
                ? `Masuk: ${format(new Date(todayAttendance.checkInTime), "HH:mm")} WIB`
                : "Klik untuk mulai absensi"}
            </div>
          </div>
        </a>

        {/* Quick Action — Izin & Cuti */}
        <a
          href="/leave"
          className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-blue-50/40 border border-gray-200 shadow-2xs transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 group-hover:bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 transition-colors">
              <ClipboardList size={22} />
            </div>
            <div>
              <div className="font-semibold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">
                Pengajuan Izin & Cuti
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                Izin sakit, cuti tahunan, atau tugas dinas luar
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
            Ajukan
          </span>
        </a>

        {/* Recent History */}
        <RecentAttendanceList records={serializedRecent} />
      </div>
    </div>
  );
}
