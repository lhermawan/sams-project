"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, LogIn, Search, Filter } from "lucide-react";

export default function TenantTable({ initialTenants }: { initialTenants: any[] }) {
  const router = useRouter();
const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredTenants = initialTenants.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.subdomain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" ? true : statusFilter === "ACTIVE" ? t.isActive : !t.isActive;
    return matchesSearch && matchesStatus;
  });


  const handleImpersonate = async (tenantId: string, subdomain: string) => {
    setLoadingId(tenantId);
    try {
      const res = await fetch(`/api/super-admin/impersonate?tenantId=${tenantId}`);
      if (!res.ok) throw new Error("Gagal membuat sesi login");
      const { token } = await res.json();
      
      const port = window.location.port ? `:${window.location.port}` : '';
      const isLocal = window.location.hostname.endsWith("localhost") || window.location.hostname === "127.0.0.1";
      const host = isLocal ? `${subdomain}.localhost${port}` : `${subdomain}.niskala.id`;
      const protocol = window.location.protocol;
      const url = `${protocol}//${host}/impersonate?token=${token}`;
      window.open(url, "_blank");
    } catch (err) {
      alert("Gagal masuk ke admin panel tenant ini");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus tenant "${name}"? Semua data (karyawan, absensi) akan terhapus permanen.`)) {
      return;
    }

    setLoadingId(id);
    try {
      const res = await fetch(`/api/super-admin/tenants/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus tenant");
      router.refresh();
    } catch (err) {
      alert("Terjadi kesalahan saat menghapus");
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/super-admin/tenants/${id}`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (!res.ok) throw new Error("Gagal mengupdate status");
      router.refresh();
    } catch (err) {
      alert("Terjadi kesalahan");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Search and Filter Header */}
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4 bg-gray-50/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari nama perusahaan atau subdomain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-gray-800"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-700">Company Name</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Subdomain</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Employees</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Created At</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTenants.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                <td className="px-6 py-4 text-indigo-600 font-mono text-xs">
                  <a href={"http://" + t.subdomain + ".localhost:3000"} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {t.subdomain}.niskala.id
                  </a>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleToggleStatus(t.id, t.isActive)}
                    disabled={loadingId === t.id || t.subdomain === "app"}
                    className={"px-3 py-1 rounded-full text-xs font-medium transition-opacity " + (
                      t.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    ) + (loadingId === t.id ? ' opacity-50' : '')}
                  >
                    {t.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-6 py-4 text-gray-600">{t._count?.employees || 0} employees</td>
                <td className="px-6 py-4 text-gray-500">{new Date(t.createdAt).toLocaleDateString("id-ID")}</td>
                <td className="px-6 py-4 text-right">
                  {t.subdomain !== "app" && (
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleImpersonate(t.id, t.subdomain)}
                        disabled={loadingId === t.id}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        title="Masuk sebagai Admin (Impersonate)"
                      >
                        <LogIn className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => router.push("/tenants/" + t.id + "/edit")}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Edit Tenant"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id, t.name)}
                        disabled={loadingId === t.id}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Tenant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredTenants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <Search className="w-10 h-10 mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">Tidak ada tenant ditemukan</p>
                    <p className="text-sm mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}