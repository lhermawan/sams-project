import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { User, Phone, MapPin, Building, Briefcase, Mail, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";

export default async function ProfilePage() {
  const session = await auth();
  const employeeId = session?.user?.employeeId;

  const employee = employeeId
    ? await prisma.employee.findUnique({
        where: { id: employeeId },
        include: { user: { select: { email: true } } },
      })
    : null;

  if (!employee) return null;

  const [totalCount, validCount, lateCount] = await Promise.all([
    prisma.attendance.count({ where: { employeeId: employeeId! } }),
    prisma.attendance.count({ where: { employeeId: employeeId!, status: "VALID" } }),
    prisma.attendance.count({ where: { employeeId: employeeId!, status: "LATE" } }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-5 pt-12 pb-8 text-white text-center">
        <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-blue-600 shadow-lg mb-3">
          {employee.photoUrl ? (
            <img src={employee.photoUrl} alt={employee.name} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            employee.name.charAt(0)
          )}
        </div>
        <h1 className="text-xl font-bold">{employee.name}</h1>
        <p className="text-blue-200 text-sm mt-1">{employee.position}</p>
        <div className="inline-block bg-blue-500 bg-opacity-50 rounded-full px-3 py-1 text-xs mt-2">
          ID Pegawai: {employee.nip}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[
            { label: "Total Absensi", value: totalCount },
              { label: "Tepat Waktu", value: validCount },
              { label: "Terlambat", value: lateCount },
            ].map((s) => (
              <div key={s.label} className="p-4 text-center">
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Informasi Pegawai</h2>
          <div className="space-y-3">
            {[
              { icon: Mail, label: "Email", value: employee.user.email },
              { icon: Building, label: "Bagian", value: employee.department },
              { icon: Briefcase, label: "Jabatan", value: employee.position },
              { icon: Phone, label: "No. Telepon", value: employee.phone ?? "—" },
              { icon: MapPin, label: "Alamat", value: employee.address ?? "—" },
              {
                icon: User,
                label: "Bergabung",
                value: format(new Date(employee.joinDate), "dd MMMM yyyy", { locale: id }),
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={15} className="text-blue-500" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">{label}</div>
                  <div className="text-sm text-gray-700">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-600 py-3 rounded-2xl font-medium text-sm hover:bg-red-100 transition-colors"
          >
            <LogOut size={16} />
            Keluar dari Akun
          </button>
        </form>
      </div>
    </div>
  );
}
