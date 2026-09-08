import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Building2, Users } from "lucide-react";
import TenantTable from "@/components/super-admin/TenantTable";

export default async function SuperAdminDashboard() {
  const session = await auth();

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/super-admin/login");
  }

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: { users: true, employees: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-gray-500">Manage all SAMS tenants and companies.</p>
          </div>
          <a href="/tenants/new" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-sm">
            + Add New Tenant
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Building2 size={24} />
              </div>
              <h3 className="font-semibold text-gray-700">Total Tenants</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{tenants.length}</p>
          </div>
        </div>

        <TenantTable initialTenants={tenants} />
      </div>
    </div>
  );
}
