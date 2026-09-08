"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function NewUserForm({ tenants }: { tenants: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    tenantId: "",
    email: "",
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/super-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: "ADMIN" })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan");
      
      router.push("/users");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Admin User</h1>
          <p className="text-gray-500">Buat akun Admin untuk tenant yang sudah ada.</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Pilih Tenant / Perusahaan</label>
              <select 
                required
                value={form.tenantId} 
                onChange={e => setForm({...form, tenantId: e.target.value})}
                className="w-full px-4 py-2 border rounded-xl bg-white"
              >
                <option value="" disabled>-- Pilih Perusahaan --</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.subdomain}.niskala.id)</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Email Login</label>
              <input 
                type="email" required
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-4 py-2 border rounded-xl" placeholder="admin@perusahaan.com" 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input 
                type="password" required
                value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full px-4 py-2 border rounded-xl" placeholder="********" 
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button 
              type="submit" disabled={loading || !form.tenantId}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Buat Akun"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
