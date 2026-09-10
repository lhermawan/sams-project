import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Building2, Users, Briefcase, Activity } from "lucide-react";
import TenantTable from "@/components/super-admin/TenantTable";
import Link from "next/link";

export default async function SuperAdminDashboard() {
  const session = await auth();

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/super-admin/login");
  }

  const tenants = await prisma.tenant.findMany({
    where: { subdomain: { not: "app" } },
    include: {
      _count: {
        select: { 
          users: { where: { role: "ADMIN" } }, 
          employees: true 
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.isActive).length;
  const totalEmployees = tenants.reduce((acc, t) => acc + t._count.employees, 0);
  const totalAdmins = tenants.reduce((acc, t) => acc + t._count.users, 0);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Super Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">Ringkasan statistik dan manajemen klien (Tenant) SAMS.</p>
          </div>
          <Link 
            href="/tenants/new" 
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 hover:shadow-md transition-all font-medium text-sm flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Tambah Tenant
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-500 text-sm">Total Tenants</h3>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Building2 size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalTenants}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-500 text-sm">Tenants Aktif</h3>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Activity size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{activeTenants}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-500 text-sm">Total Admin</h3>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Users size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalAdmins}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-500 text-sm">Total Karyawan</h3>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Briefcase size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalEmployees}</p>
          </div>
        </div>

        {/* Tenants Table Section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <TenantTable initialTenants={tenants} />
        </div>
      </div>
    </div>
  );
}
