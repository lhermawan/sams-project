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
    orderBy: { name: "asc" }
  });

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Export Laporan</h1>
          <p className="text-gray-500 mt-1">Tarik data absensi dari seluruh perusahaan atau perusahaan tertentu.</p>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
          <SuperAdminReportForm tenants={tenants} />
        </div>
      </div>
    </div>
  );
}
