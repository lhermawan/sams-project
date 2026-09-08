"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function EditTenantForm({ tenant }: { tenant: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    name: tenant.name,
    subdomain: tenant.subdomain,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}`, {
        method: "PUT",
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
    <>
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Tenant</h1>
          <p className="text-gray-500">Update company details for {tenant.name}.</p>
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
              <p className="text-xs text-gray-500">Changing the subdomain will log out all current users for this tenant.</p>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button 
              type="submit" disabled={loading || (form.name === tenant.name && form.subdomain === tenant.subdomain)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
