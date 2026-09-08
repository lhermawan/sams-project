import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import UserTable from "@/components/super-admin/UserTable";
import Link from "next/link";
import { Users } from "lucide-react";

export default async function UsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/super-admin/login");
  }

  const users = await prisma.user.findMany({
    where: { role: { not: "EMPLOYEE" } },
    include: { tenant: { select: { name: true, subdomain: true } } },
    orderBy: [{ tenantId: "asc" }, { role: "asc" }, { email: "asc" }]
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
            <p className="text-gray-500">Kelola akun Admin untuk tenant yang terdaftar.</p>
          </div>
          <Link href="/users/new" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-sm">
            + Add New User
          </Link>
        </div>

        <UserTable users={users} />
      </div>
    </div>
  );
}
