"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function NewUserForm({ tenants }: { tenants: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    tenantId: "",
    role: "ADMIN",
    email: "",
    password: "Password@123", // Default password
    name: "",
    nip: "",
    department: "",
    position: "",
    employeeTypeId: "",
  });

  const [employeeTypes, setEmployeeTypes] = useState<Array<{ id: string; code: string; name: string }>>([]);

  // Fetch employee types when tenant is selected and role is EMPLOYEE
  useEffect(() => {
    if (form.role === "EMPLOYEE" && form.tenantId) {
      fetch(`/api/super-admin/tenants/${form.tenantId}/employee-types`)
        .then((res) => res.json())
        .then((data) => setEmployeeTypes(data.employeeTypes || []))
        .catch(() => setEmployeeTypes([]));
    } else {
      setEmployeeTypes([]);
    }
  }, [form.tenantId, form.role]);

  // Auto-generate username for employee based on name
  useEffect(() => {
    if (form.role === "EMPLOYEE" && form.name) {
      const suggestedUsername = form.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") // Remove spaces and special chars
        .substring(0, 20); // Limit length
      if (suggestedUsername) {
        setForm(prev => ({ ...prev, email: `${suggestedUsername}@5758inc.id` }));
      }
    }
  }, [form.name, form.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/super-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan");
      
      router.push("/super-admin/users");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New User</h1>
          <p className="text-gray-500">Buat akun untuk Mitra (Tenant) yang sudah ada.</p>
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
              <label className="block text-sm font-medium text-gray-700">Pilih Mitra / Perusahaan</label>
              <select 
                required
                value={form.tenantId} 
                onChange={e => setForm({...form, tenantId: e.target.value})}
                className="w-full px-4 py-2 border rounded-xl bg-white"
              >
                <option value="" disabled>-- Pilih Perusahaan --</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.subdomain}.5758inc.my.id)</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Peran (Role)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="role"
                    value="ADMIN"
                    checked={form.role === "ADMIN"}
                    onChange={e => setForm({...form, role: e.target.value})}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Admin Mitra</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="role"
                    value="EMPLOYEE"
                    checked={form.role === "EMPLOYEE"}
                    onChange={e => setForm({...form, role: e.target.value})}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Pegawai</span>
                </label>
              </div>
            </div>

            {form.role === "EMPLOYEE" && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                  <input 
                    type="text" required={form.role === "EMPLOYEE"}
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-xl" placeholder="Nama Pegawai" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">NIP</label>
                  <input 
                    type="text" required={form.role === "EMPLOYEE"}
                    value={form.nip} onChange={e => setForm({...form, nip: e.target.value})}
                    className="w-full px-4 py-2 border rounded-xl" placeholder="NIP / ID Pegawai" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Bagian (Department)</label>
                  <input 
                    type="text" required={form.role === "EMPLOYEE"}
                    value={form.department} onChange={e => setForm({...form, department: e.target.value})}
                    className="w-full px-4 py-2 border rounded-xl" placeholder="Contoh: IT" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Jabatan (Position)</label>
                  <input 
                    type="text" required={form.role === "EMPLOYEE"}
                    value={form.position} onChange={e => setForm({...form, position: e.target.value})}
                    className="w-full px-4 py-2 border rounded-xl" placeholder="Contoh: Staff" 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Jenis Pegawai</label>
                  <select 
                    required={form.role === "EMPLOYEE"}
                    value={form.employeeTypeId} 
                    onChange={e => setForm({...form, employeeTypeId: e.target.value})}
                    className="w-full px-4 py-2 border rounded-xl bg-white disabled:bg-gray-100"
                    disabled={!form.tenantId || employeeTypes.length === 0}
                  >
                    <option value="" disabled>-- Pilih Jenis Pegawai --</option>
                    {employeeTypes.map(et => (
                      <option key={et.id} value={et.id}>{et.name} ({et.code})</option>
                    ))}
                  </select>
                  {form.tenantId && employeeTypes.length === 0 && form.role === "EMPLOYEE" && (
                    <p className="text-xs text-orange-500 mt-1">Mitra ini belum memiliki Jenis Pegawai. Silakan buat terlebih dahulu.</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {form.role === "EMPLOYEE" ? "Username (Email)" : "Email Login"}
              </label>
              <input 
                type="email" required
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-4 py-2 border rounded-xl" 
                placeholder={form.role === "EMPLOYEE" ? "user@5758inc.id" : "admin@perusahaan.com"} 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input 
                type="text" required
                value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full px-4 py-2 border rounded-xl" placeholder="********" 
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button 
              type="submit" disabled={loading || !form.tenantId || (form.role === "EMPLOYEE" && !form.employeeTypeId)}
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
