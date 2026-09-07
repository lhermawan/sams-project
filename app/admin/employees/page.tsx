import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Plus, Search, Download } from "lucide-react";
import EmployeeTable from "@/components/admin/EmployeeTable";

interface SearchParams {
  search?: string;
  department?: string;
  page?: string;
}

async function getEmployees(searchParams: SearchParams) {
  const page = parseInt(searchParams.page ?? "1");
  const limit = 20;
  const search = searchParams.search ?? "";
  const department = searchParams.department ?? "";

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { nip: { contains: search, mode: "insensitive" } },
    ];
  }
  if (department) where.department = department;

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: { user: { select: { email: true, isActive: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.employee.count({ where }),
  ]);

  return { employees, total, page, limit };
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const { employees, total, page, limit } = await getEmployees(searchParams);
  const totalPages = Math.ceil(total / limit);

  const serializedEmployees = employees.map((emp) => ({
    id: emp.id,
    nip: emp.nip,
    name: emp.name,
    department: emp.department,
    position: emp.position,
    phone: emp.phone,
    address: emp.address,
    photoUrl: emp.photoUrl,
    joinDate: emp.joinDate ? emp.joinDate.toISOString() : null,
    isActive: emp.isActive,
    user: {
      email: emp.user.email,
      isActive: emp.user.isActive,
    },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Manajemen Pegawai</h2>
          <p className="text-sm text-gray-500">{total} pegawai terdaftar di sistem</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/api/employees/template"
            download="template_data_pegawai_sams.csv"
            className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-2xs cursor-pointer"
            title="Unduh format template CSV resmi untuk memudahkan input ratusan/ribuan pegawai"
          >
            <Download size={15} className="text-emerald-600" />
            Unduh Format CSV
          </a>
          <Link
            href="/admin/employees/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-xs"
          >
            <Plus size={16} />
            Tambah Pegawai
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <form className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="search"
              defaultValue={searchParams.search}
              placeholder="Cari nama atau ID Pegawai..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <input
            name="department"
            defaultValue={searchParams.department}
            placeholder="Filter Bagian..."
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            Cari
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <EmployeeTable employees={serializedEmployees} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total}
            </p>
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`?page=${p}${searchParams.search ? `&search=${searchParams.search}` : ""}${searchParams.department ? `&department=${searchParams.department}` : ""}`}
                  className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center ${
                    p === page
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
