"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, LogIn } from "lucide-react";

export default function TenantTable({ initialTenants }: { initialTenants: any[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);


  const handleImpersonate = async (tenantId: string, subdomain: string) => {
    setLoadingId(tenantId);
    try {
      const res = await fetch(`/api/super-admin/impersonate?tenantId=${tenantId}`);
      if (!res.ok) throw new Error("Gagal membuat sesi login");
      const { token } = await res.json();
      
      const port = window.location.port ? `:${window.location.port}` : '';
      const url = `http://${subdomain}.localhost${port}/impersonate?token=${token}`;
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-left text-sm">
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
          {initialTenants.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
              <td className="px-6 py-4 text-blue-600 font-mono text-xs">
                <a href={`http://${t.subdomain}.localhost:3000`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {t.subdomain}.niskala.id
                </a>
              </td>
              <td className="px-6 py-4">
                <button 
                  onClick={() => handleToggleStatus(t.id, t.isActive)}
                  disabled={loadingId === t.id || t.subdomain === "app"}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-opacity ${
                    t.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                  } ${loadingId === t.id ? 'opacity-50' : ''}`}
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
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                      title="Masuk sebagai Admin (Impersonate)"
                    >
                      <LogIn className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => router.push(`/tenants/${t.id}/edit`)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit Tenant"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(t.id, t.name)}
                      disabled={loadingId === t.id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Hapus Tenant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {initialTenants.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                Belum ada tenant terdaftar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
