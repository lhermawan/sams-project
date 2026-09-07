"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Upload } from "lucide-react";
import Link from "next/link";

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

// Top-level stable component to prevent unmounting and focus loss on keystroke
function FormField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-gray-900 placeholder:text-gray-400"
      />
    </div>
  );
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    nip: "",
    email: "",
    password: "Pegawai@123",
    department: "",
    position: "",
    phone: "",
    address: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Gagal menambahkan pegawai");
      }

      router.push("/admin/employees");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan pegawai");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/employees" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Tambah Pegawai Baru</h2>
          <p className="text-sm text-gray-500">Isi data pegawai dengan lengkap</p>
        </div>
      </div>

      {/* CSV Bulk Import Banner */}
      <div className="mb-5 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Upload size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800">
              Ingin Menambahkan Banyak / Ribuan Pegawai Sekaligus?
            </div>
            <div className="text-xs text-gray-500">
              Gunakan fitur upload berkas CSV agar tidak perlu mengisi satu per satu secara manual.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/employees/template"
            download="template_data_pegawai_sams.csv"
            className="px-3 py-1.5 bg-white hover:bg-gray-50 text-purple-700 rounded-xl text-xs font-semibold border border-purple-200 shadow-2xs"
          >
            Unduh Format CSV
          </a>
          <Link
            href="/admin/employees"
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
          >
            Buka Upload CSV
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Nama Lengkap"
            value={form.name}
            onChange={(v) => updateField("name", v)}
            required
            placeholder="Ahmad Rizki"
          />
          <FormField
            label="ID Pegawai"
            value={form.nip}
            onChange={(v) => updateField("nip", v)}
            required
            placeholder="2024001"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Email"
            value={form.email}
            onChange={(v) => updateField("email", v)}
            type="email"
            required
            placeholder="nama@perusahaan.com"
          />
          <FormField
            label="Password Awal"
            value={form.password}
            onChange={(v) => updateField("password", v)}
            type="password"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Bagian"
            value={form.department}
            onChange={(v) => updateField("department", v)}
            required
            placeholder="Cth: Bagian Produksi"
          />
          <FormField
            label="Jabatan"
            value={form.position}
            onChange={(v) => updateField("position", v)}
            required
            placeholder="Software Engineer"
          />
        </div>

        <FormField
          label="No. Telepon"
          value={form.phone}
          onChange={(v) => updateField("phone", v)}
          type="tel"
          placeholder="08123456789"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
          <textarea
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            rows={3}
            placeholder="Jl. Contoh No. 1, Jakarta"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 transition-colors"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/admin/employees"
            className="flex-1 text-center py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isLoading ? "Menyimpan..." : "Simpan Pegawai"}
          </button>
        </div>
      </form>
    </div>
  );
}