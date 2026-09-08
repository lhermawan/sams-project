import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  CalendarCheck,
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { id } from "date-fns/locale";

async function getDashboardStats(tenantId: string) {
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);

  const totalEmployees = await prisma.employee.count({ where: { tenantId, isActive: true } });
  
  const presentToday = await prisma.attendance.count({
    where: {
      tenantId,
      date: { gte: startOfToday, lte: endOfToday },
      status: { in: ["VALID", "LATE"] },
    },
  });
  
  const lateToday = await prisma.attendance.count({
    where: {
      tenantId,
      date: { gte: startOfToday, lte: endOfToday },
      status: "LATE",
    },
  });
  
  const pendingValidation = await prisma.attendance.count({
    where: { tenantId, status: "PENDING" },
  });
  
  const pendingLeave = await prisma.leaveRequest.count({
    where: { tenantId, status: "PENDING" },
  });

  const absentToday = totalEmployees - presentToday;

  return { totalEmployees, presentToday, lateToday, absentToday, pendingValidation, pendingLeave };
}

async function getRecentAttendance(tenantId: string) {
  return prisma.attendance.findMany({
    where: { tenantId, date: { gte: startOfDay(new Date()) } },
    include: { employee: true },
    orderBy: { checkInTime: "desc" },
    take: 10,
  });
}

export default async function AdminDashboardPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId as string;
  const stats = await getDashboardStats(tenantId);
  const recentAttendance = await getRecentAttendance(tenantId);
  const todayStr = format(new Date(), "EEEE, dd MMMM yyyy", { locale: id });

  const statCards = [
    {
      label: "Total Pegawai",
      value: stats.totalEmployees,
      icon: Users,
      color: "bg-blue-500",
      lightColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      label: "Hadir Hari Ini",
      value: stats.presentToday,
      icon: UserCheck,
      color: "bg-green-500",
      lightColor: "bg-green-50",
      textColor: "text-green-600",
    },
    {
      label: "Terlambat",
      value: stats.lateToday,
      icon: Clock,
      color: "bg-orange-500",
      lightColor: "bg-orange-50",
      textColor: "text-orange-600",
    },
    {
      label: "Tidak Hadir",
      value: stats.absentToday,
      icon: UserX,
      color: "bg-red-500",
      lightColor: "bg-red-50",
      textColor: "text-red-600",
    },
    {
      label: "Perlu Validasi",
      value: stats.pendingValidation,
      icon: AlertCircle,
      color: "bg-yellow-500",
      lightColor: "bg-yellow-50",
      textColor: "text-yellow-600",
    },
    {
      label: "Permohonan Cuti",
      value: stats.pendingLeave,
      icon: ClipboardList,
      color: "bg-purple-500",
      lightColor: "bg-purple-50",
      textColor: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Selamat Datang, {session?.user?.name}
        </h2>
        <p className="text-gray-500 text-sm mt-1">{todayStr}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={`w-12 h-12 ${card.lightColor} rounded-xl flex items-center justify-center`}>
              <card.icon className={`w-6 h-6 ${card.textColor}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{card.value}</div>
              <div className="text-sm text-gray-500">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Attendance Progress */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-500" />
          Kehadiran Hari Ini
        </h3>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{
                width: stats.totalEmployees > 0
                  ? `${Math.round((stats.presentToday / stats.totalEmployees) * 100)}%`
                  : "0%",
              }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {stats.totalEmployees > 0
              ? Math.round((stats.presentToday / stats.totalEmployees) * 100)
              : 0}%
          </span>
        </div>
        <p className="text-sm text-gray-500">
          {stats.presentToday} dari {stats.totalEmployees} pegawai hadir
        </p>
      </div>

      {/* Recent Attendance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Absensi Terbaru Hari Ini</h3>
        </div>
        <div className="overflow-x-auto">
          {recentAttendance.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarCheck size={40} className="mx-auto mb-2 opacity-30" />
              <p>Belum ada data absensi hari ini</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">Pegawai</th>
                  <th className="px-6 py-3 text-left">Bagian</th>
                  <th className="px-6 py-3 text-left">Jam Masuk</th>
                  <th className="px-6 py-3 text-left">Jam Keluar</th>
                  <th className="px-6 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentAttendance.map((att) => (
                  <tr key={att.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                          {att.employee.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{att.employee.name}</div>
                          <div className="text-xs text-gray-400">{att.employee.nip}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{att.employee.department}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {att.checkInTime
                        ? format(new Date(att.checkInTime), "HH:mm")
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {att.checkOutTime
                        ? format(new Date(att.checkOutTime), "HH:mm")
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          att.status === "VALID"
                            ? "bg-green-100 text-green-700"
                            : att.status === "LATE"
                            ? "bg-orange-100 text-orange-700"
                            : att.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {att.status === "VALID"
                          ? "Hadir"
                          : att.status === "LATE"
                          ? "Terlambat"
                          : att.status === "PENDING"
                          ? "Menunggu"
                          : att.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
