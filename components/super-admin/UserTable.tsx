"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Key } from "lucide-react";

export default function UserTable({ users }: { users: any[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus user "${email}"?`)) return;

    setLoadingId(id);
    try {
      const res = await fetch(`/api/super-admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch (err) {
      alert("Gagal menghapus user");
    } finally {
      setLoadingId(null);
    }
  };


  const handleResetPassword = async (id: string, email: string) => {
    const newPassword = prompt(`Masukkan password baru untuk ${email}:`);
    if (!newPassword) return; // cancelled or empty
    if (newPassword.length < 6) {
      alert("Password terlalu pendek (minimal 6 karakter).");
      return;
    }

    setLoadingId(id);
    try {
      const res = await fetch(`/api/super-admin/users/${id}`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword })
      });
      if (!res.ok) throw new Error();
      alert(`Password untuk ${email} berhasil direset!`);
    } catch (err) {
      alert("Gagal mereset password");
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/super-admin/users/${id}`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive })
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch (err) {
      alert("Gagal mengupdate status");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 font-semibold text-gray-700">Email</th>
            <th className="px-6 py-4 font-semibold text-gray-700">Role</th>
            <th className="px-6 py-4 font-semibold text-gray-700">Tenant</th>
            <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900">{u.email}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {u.role}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-600">{u.tenant?.name || '-'}</td>
              <td className="px-6 py-4">
                <button 
                  onClick={() => handleToggleStatus(u.id, u.isActive)}
                  disabled={loadingId === u.id || u.role === 'SUPER_ADMIN'}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-opacity ${
                    u.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                  } ${loadingId === u.id ? 'opacity-50' : ''}`}
                >
                  {u.isActive ? "Active" : "Inactive"}
                </button>
              </td>
              <td className="px-6 py-4 text-right">
                {u.role !== 'SUPER_ADMIN' && (
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleResetPassword(u.id, u.email)}
                      disabled={loadingId === u.id}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Reset Password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(u.id, u.email)}
                      disabled={loadingId === u.id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                Belum ada user terdaftar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
