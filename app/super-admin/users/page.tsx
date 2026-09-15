import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import UserTable from "@/components/super-admin/UserTable";
import Link from "next/link";
import { Plus, FileUp } from "lucide-react";
import NormalizeEmailsButton from "./NormalizeEmailsButton";

export default async function UsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/super-admin/login");
  }

  // Ambil list semua tenant untuk filter dropdown
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, subdomain: true },
    orderBy: { name: "asc" },
  });

  // Ambil seluruh user (ADMIN, EMPLOYEE, dan SUPER_ADMIN) beserta data pegawai dan tenant
  const users = await prisma.user.findMany({
    include: {
      tenant: { select: { id: true, name: true, subdomain: true } },
      employee: {
        select: {
          id: true,
          nip: true,
          name: true,
          department: true,
          position: true,
          phone: true,
          photoUrl: true,
        },
      },
    },
    orderBy: [{ tenantId: "asc" }, { role: "asc" }, { email: "asc" }],
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kelola Pengguna</h1>
            <p className="text-sm text-gray-500">
              Kelola seluruh akun Admin, Pegawai, dan Super Admin di semua tenant perusahaan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NormalizeEmailsButton />
            <Link
              href="/super-admin/users/import"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer w-fit"
            >
              <FileUp size={16} />
              Import Massal
            </Link>
            <Link
              href="/super-admin/users/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors shadow-xs cursor-pointer w-fit"
            >
              <Plus size={16} />
              Tambah User Baru
            </Link>
          </div>
        </div>

        <UserTable initialUsers={users} tenants={tenants} currentUserId={session.user.id} />
      </div>
    </div>
  );
}

