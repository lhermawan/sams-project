"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileType, Check, AlertCircle } from "lucide-react";
import Papa from "papaparse";

export default function ImportUsersClient({ tenants }: { tenants: any[] }) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
    setSuccess("");

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError("Gagal membaca file CSV. Pastikan formatnya benar.");
        } else {
          setPreviewData(results.data.slice(0, 5)); // Preview 5 rows
        }
      },
    });
  };

  const downloadTemplate = () => {
    const csvContent = "Nama Lengkap,NIP,Bagian,Jabatan,Kode Jenis Pegawai\nBudi Santoso,12345,IT,Staff,NS\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template_import_pegawai.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!file || !tenantId) return;

    setLoading(true);
    setError("");
    setSuccess("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await fetch("/api/super-admin/users/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tenantId,
              data: results.data
            })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Gagal melakukan import");

          setSuccess(`Berhasil mengimport ${data.count} pegawai.`);
          setFile(null);
          setPreviewData([]);
          setTimeout(() => {
            router.push("/super-admin/users");
            router.refresh();
          }, 2000);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Massal Pegawai</h1>
          <p className="text-gray-500">Tambahkan banyak pegawai sekaligus menggunakan file CSV.</p>
        </div>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-start gap-3">
            <Check className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{success}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Pilih Mitra / Perusahaan Target</label>
          <select 
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" disabled>-- Pilih Perusahaan --</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.subdomain}.5758inc.my.id)</option>
            ))}
          </select>
        </div>

        <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
            <FileType className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Upload File CSV</p>
            <p className="text-xs text-gray-500 mt-1">Pastikan format sesuai dengan template.</p>
          </div>
          <div className="flex justify-center gap-3">
            <button 
              onClick={downloadTemplate}
              className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
            >
              Unduh Template
            </button>
            <label className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition cursor-pointer">
              Pilih File
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
          {file && (
            <p className="text-sm font-medium text-green-600 mt-2 flex items-center justify-center gap-1.5">
              <Check size={14} /> {file.name}
            </p>
          )}
        </div>

        {previewData.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Preview Data (Max 5 baris)</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 font-medium text-gray-600">Nama Lengkap</th>
                    <th className="px-4 py-2 font-medium text-gray-600">NIP</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Bagian</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Jabatan</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Kode Jenis Pegawai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">{row["Nama Lengkap"] || "-"}</td>
                      <td className="px-4 py-2">{row["NIP"] || "-"}</td>
                      <td className="px-4 py-2">{row["Bagian"] || "-"}</td>
                      <td className="px-4 py-2">{row["Jabatan"] || "-"}</td>
                      <td className="px-4 py-2">{row["Kode Jenis Pegawai"] || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-4 border-t flex justify-end">
          <button 
            onClick={handleImport}
            disabled={loading || !file || !tenantId}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Memproses..." : (
              <>
                <Upload size={18} />
                Import Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
