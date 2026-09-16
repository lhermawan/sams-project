"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileType, Check, AlertCircle } from "lucide-react";
import ExcelJS from "exceljs";

export default function ImportEmployeesClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [allData, setAllData] = useState<any[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
    setSuccess("");
    setProgress(0);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error("Format file Excel tidak valid atau kosong.");

      const rows: any[] = [];
      const headers: string[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell, colNumber) => {
            headers[colNumber] = cell.value?.toString().trim() || "";
          });
        } else {
          const rowData: any = {};
          let isEmptyRow = true;
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const header = headers[colNumber];
            if (header) {
              const val = cell.value?.toString().trim() || "";
              rowData[header] = val;
              if (val) isEmptyRow = false;
            }
          });
          if (!isEmptyRow) rows.push({ _rowNumber: rowNumber, ...rowData });
        }
      });

      // Validation
      const errors: string[] = [];
      rows.forEach((row) => {
        if (!row["NIP"]) errors.push(`Baris ${row._rowNumber}: 'NIP' tidak boleh kosong.`);
        if (!row["Nama Lengkap"]) errors.push(`Baris ${row._rowNumber}: 'Nama Lengkap' tidak boleh kosong.`);
        if (!row["Kode Jenis Pegawai"]) errors.push(`Baris ${row._rowNumber}: 'Kode Jenis Pegawai' tidak boleh kosong.`);
      });

      if (errors.length > 0) {
        setFile(null);
        setError(`Ditemukan ${errors.length} error validasi:\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n...dan ${errors.length - 5} error lainnya.` : ""}`);
        return;
      }

      setAllData(rows);
      setPreviewData(rows.slice(0, 5));
    } catch (err: any) {
      setError("Gagal membaca file Excel. Pastikan formatnya benar (.xlsx).");
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!file || allData.length === 0) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setProgress(0);

    const batchSize = 100;
    let totalSuccess = 0;

    try {
      for (let i = 0; i < allData.length; i += batchSize) {
        const batch = allData.slice(i, i + batchSize);
        
        const res = await fetch("/api/employees/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employees: batch
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal melakukan import pada batch tertentu");

        totalSuccess += (data.insertedCount || 0) + (data.updatedCount || 0);
        setProgress(Math.round(((i + batch.length) / allData.length) * 100));
      }

      setSuccess(`Berhasil memproses ${totalSuccess} pegawai.`);
      setFile(null);
      setPreviewData([]);
      setAllData([]);
      setTimeout(() => {
        router.back();
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Massal Pegawai</h1>
          <p className="text-gray-500">Tambahkan banyak pegawai sekaligus menggunakan file Excel (.xlsx).</p>
        </div>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-start gap-3 whitespace-pre-wrap">
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

        <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
            <FileType className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Upload File Excel (.xlsx)</p>
            <p className="text-xs text-gray-500 mt-1">Pastikan format sesuai dengan template.</p>
          </div>
          <div className="flex justify-center gap-3">
            <a 
              href="/api/employees/template"
              className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition inline-flex items-center"
            >
              Unduh Template
            </a>
            <label className={`text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              Pilih File
              <input type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} disabled={loading} />
            </label>
          </div>
          {file && (
            <p className="text-sm font-medium text-green-600 mt-2 flex items-center justify-center gap-1.5">
              <Check size={14} /> {file.name} ({allData.length} baris data)
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
                    <th className="px-4 py-2 font-medium text-gray-600">NIP</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Nama Lengkap</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Kode Jenis Pegawai</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Bagian</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Jabatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">{row["NIP"] || "-"}</td>
                      <td className="px-4 py-2">{row["Nama Lengkap"] || "-"}</td>
                      <td className="px-4 py-2">{row["Kode Jenis Pegawai"] || "-"}</td>
                      <td className="px-4 py-2">{row["Bagian"] || "-"}</td>
                      <td className="px-4 py-2">{row["Jabatan"] || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium text-gray-700">
              <span>Memproses Import...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t flex justify-end">
          <button 
            onClick={handleImport}
            disabled={loading || !file || allData.length === 0}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Mengimport..." : (
              <>
                <Upload size={18} />
                Mulai Import Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
