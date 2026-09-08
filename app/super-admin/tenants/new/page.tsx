"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";

export default function NewTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    adminEmail: "",
    adminPassword: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/super-admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan");
      
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Tenant</h1>
            <p className="text-gray-500">Register a new company to the platform.</p>
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
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input 
                  type="text" required
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-xl" placeholder="PT. Jaya Abadi" 
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Subdomain</label>
                <div className="flex">
                  <input 
                    type="text" required
                    value={form.subdomain} onChange={e => setForm({...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                    className="w-full px-4 py-2 border border-r-0 rounded-l-xl focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="jayaabadi" 
                  />
                  <div className="px-4 py-2 bg-gray-100 border rounded-r-xl text-gray-500 flex items-center">
                    .niskala.id
                  </div>
                </div>
                <p className="text-xs text-gray-500">Only letters, numbers, and hyphens.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Admin Email</label>
                <input 
                  type="email" required
                  value={form.adminEmail} onChange={e => setForm({...form, adminEmail: e.target.value})}
                  className="w-full px-4 py-2 border rounded-xl" placeholder="admin@jayaabadi.com" 
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Admin Password</label>
                <input 
                  type="password" required
                  value={form.adminPassword} onChange={e => setForm({...form, adminPassword: e.target.value})}
                  className="w-full px-4 py-2 border rounded-xl" placeholder="********" 
                />
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button 
                type="submit" disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Tenant"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
