import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import SuperAdminReportForm from "./SuperAdminReportForm";

export default async function SuperAdminReportsPage() {
  const session = await auth();

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/super-admin/login");
  }

  // Fetch all active tenants for the dropdown
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true, subdomain: { not: "app" } },
    select: { id: true, name: true, subdomain: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Laporan Presensi & Kehadiran
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pantau ringkasan statistik, live preview data absensi, dan ekspor laporan per perusahaan maupun gabungan.
          </p>
        </div>

        <SuperAdminReportForm tenants={tenants} />
      </div>
    </div>
  );
}
